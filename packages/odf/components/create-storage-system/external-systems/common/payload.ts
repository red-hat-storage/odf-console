import {
  getTaintOrTolerationIdentity,
  getTolerationsFromNodes,
  mergeTolerations,
} from '@odf/core/components/utils/scale';
import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  IBM_SCALE_NAMESPACE,
  SCALE_DAEMON_NODE_LABEL,
  LOCAL_CLUSTER_NODE_ROLE_LABEL,
} from '@odf/core/constants';
import { ClusterKind } from '@odf/core/types/scale';
import {
  ClusterModel,
  ConfigMapKind,
  ConfigMapModel,
  NamespaceModel,
  NodeModel,
  OPENSHIFT_USER_WORKLOAD_MONITORING_NAMESPACE,
  SecretKind,
  SecretModel,
} from '@odf/shared';
import { Toleration } from '@odf/shared/types';
import { k8sPatchByName } from '@odf/shared/utils';
import { createOrUpdate } from '@odf/shared/utils/k8s';
import {
  K8sKind,
  Patch,
  k8sCreate,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../reducer';

/** External KMM registry config from the SAN external registry form. Secure boot when both caCertificateSecret and privateKeySecret are provided. */
export type ExternalKMMRegistryConfig = {
  imageRegistryUrl?: string;
  imageRepositoryName?: string;
  secretKey: string;
  caCertificateSecret?: string;
  privateKeySecret?: string;
};

export const createUserDetailsSecretPayload = (
  name: string,
  username: string,
  password: string
) => {
  const secret: SecretKind = {
    apiVersion: 'v1',
    kind: SecretModel.kind,
    metadata: { name, namespace: IBM_SCALE_NAMESPACE },
    type: 'Opaque',
    stringData: { username, password },
  };
  return () =>
    createOrUpdate<SecretKind>({
      model: SecretModel,
      name,
      namespace: IBM_SCALE_NAMESPACE,
      mutate: () => secret,
    });
};

export const createConfigMapPayload = (
  name: string,
  data: Record<string, string>
) => {
  const configMap: ConfigMapKind = {
    apiVersion: 'v1',
    kind: ConfigMapModel.kind,
    metadata: { name, namespace: IBM_SCALE_NAMESPACE },
    data,
  };
  return () =>
    createOrUpdate<ConfigMapKind>({
      model: ConfigMapModel,
      name,
      namespace: IBM_SCALE_NAMESPACE,
      mutate: () => configMap,
    });
};

export const labelNodes = (
  nodes: WizardNodeState[],
  patchNodeRoleLabel = false
) => {
  const labelPath = `/metadata/labels/${SCALE_DAEMON_NODE_LABEL.replace('/', '~1')}`;
  const nodeRoleLabelPath = `/metadata/labels/${LOCAL_CLUSTER_NODE_ROLE_LABEL}`;
  const requests: Promise<K8sKind>[] = [];

  nodes.forEach((node) => {
    if (!patchNodeRoleLabel && node.labels?.[SCALE_DAEMON_NODE_LABEL]) {
      return;
    }

    const patch: Patch[] = [];
    if (!node.labels) {
      patch.push({
        op: 'add',
        path: '/metadata/labels',
        value: {},
      });
    }
    if (!node.labels?.[SCALE_DAEMON_NODE_LABEL]) {
      patch.push({
        op: 'add',
        path: labelPath,
        value: '',
      });
    }
    if (patchNodeRoleLabel) {
      patch.push({
        op: node.labels?.[LOCAL_CLUSTER_NODE_ROLE_LABEL] ? 'replace' : 'add',
        path: nodeRoleLabelPath,
        value: node.localClusterRole,
      });
    }
    requests.push(k8sPatchByName(NodeModel, node.name, null, patch));
  });

  return () => Promise.all(requests);
};

export const createScaleLocalClusterPayload = (
  externalKmmRegistry?: ExternalKMMRegistryConfig,
  addClusterLabels?: boolean,
  addResourceLimits?: boolean,
  cpuLimit?: string,
  memoryLimit?: string,
  tolerations?: Toleration[]
) => {
  const spec: ClusterKind['spec'] = {
    daemon: {
      nodeSelector: {
        [SCALE_DAEMON_NODE_LABEL]: '',
      },
      roles: [],
      clusterProfile: {
        controlSetxattrImmutableSELinux: 'yes',
        enforceFilesetQuotaOnRoot: 'yes',
        ignorePrefetchLUNCount: 'yes',
        initPrefetchBuffers: '128',
        maxblocksize: '16M',
        prefetchPct: '25',
        prefetchTimeout: '30',
      },
    },
    grafanaBridge: {
      enablePrometheusExporter: true,
    },
    license: {
      accept: true,
      license: 'data-management',
    },
  };

  if (externalKmmRegistry) {
    const hasImageRegistry =
      !!externalKmmRegistry.imageRegistryUrl &&
      !!externalKmmRegistry.imageRepositoryName;
    const isSecureBoot =
      !!externalKmmRegistry.caCertificateSecret &&
      !!externalKmmRegistry.privateKeySecret;

    // KMM is a pointer; pass an empty object when no image registry or secure boot config
    spec.gpfsModuleManagement = {
      kmm: {
        ...(hasImageRegistry && {
          imageRepository: {
            registry: externalKmmRegistry.imageRegistryUrl,
            repo: externalKmmRegistry.imageRepositoryName,
            registrySecret: externalKmmRegistry.secretKey,
          },
        }),
        ...(isSecureBoot && {
          moduleSigning: {
            keySecret: externalKmmRegistry.privateKeySecret,
            certSecret: externalKmmRegistry.caCertificateSecret,
          },
        }),
      },
    };
  }

  if (addResourceLimits) {
    spec.daemon = {
      ...spec.daemon,
      resources: {
        requests: {
          cpu: cpuLimit,
          memory: memoryLimit,
        },
      },
    };
  }

  // Tolerate the taints on the selected nodes so the Scale pods can schedule
  // onto them. Each taint-sensitive section (daemon, GUI, pmcollector and
  // grafana-bridge) has its own toleration knob that the operator fans out to
  // the matching component, so set the same tolerations on all of them —
  // otherwise those pods stay `Pending` on tainted nodes. Omitted entirely when
  // there are no taints so the CR stays byte-identical to the previous
  // (no-taint) behavior.
  if (tolerations && tolerations.length > 0) {
    spec.daemon = { ...spec.daemon, tolerations };
    spec.gui = { ...spec.gui, tolerations };
    spec.pmcollector = { ...spec.pmcollector, tolerations };
    spec.grafanaBridge = { ...spec.grafanaBridge, tolerations };
  }

  const payload: ClusterKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Cluster',
    metadata: {
      name: IBM_SCALE_LOCAL_CLUSTER_NAME,
      ...(addClusterLabels && {
        labels: {
          'app.kubernetes.io/instance': 'ibm-spectrum-scale',
          'app.kubernetes.io/name': 'cluster',
        },
      }),
    },
    spec,
  };
  return () => k8sCreate({ model: ClusterModel, data: payload });
};

// The taint-sensitive sections of the Cluster CR. Each has its own
// `tolerations` knob that the operator fans out to the matching pods, so all of
// them must be kept in sync, not just the daemon.
const TAINT_SENSITIVE_SECTIONS = [
  'daemon',
  'gui',
  'pmcollector',
  'grafanaBridge',
] as const;

/**
 * Expands an existing local Cluster's tolerations to cover the taints on
 * newly-added nodes. Without this, a node added after create time gets the
 * daemon node-selector label but no matching toleration, so its pods stay
 * `Pending` on a tainted node. Every taint-sensitive section (daemon, GUI,
 * pmcollector, grafana-bridge) is patched, so the GUI/monitoring pods — which
 * have their own toleration knobs — schedule too. Sections that are absent (e.g.
 * on a cluster created before this behavior existed) get added.
 */
export const patchScaleLocalClusterTolerations = (
  cluster: ClusterKind,
  nodes: WizardNodeState[]
) => {
  const nodeTolerations = getTolerationsFromNodes(nodes);

  const patch: Patch[] = TAINT_SENSITIVE_SECTIONS.flatMap<Patch>((section) => {
    const sectionSpec = cluster?.spec?.[section];
    const existingTolerations = sectionSpec?.tolerations ?? [];
    const mergedTolerations = mergeTolerations(
      existingTolerations,
      nodeTolerations
    );

    // Nothing new to tolerate for this section -> skip it. Compare by identity,
    // not list length: duplicates in the existing list can make the merged
    // length equal even when a genuinely new toleration was added, so a length
    // check would silently skip the patch.
    const existingIdentities = new Set(
      existingTolerations.map(getTaintOrTolerationIdentity)
    );
    const hasNewToleration = mergedTolerations.some(
      (toleration) =>
        !existingIdentities.has(getTaintOrTolerationIdentity(toleration))
    );
    if (!hasNewToleration) {
      return [];
    }

    // The section object is missing entirely -> add it. A JSON Patch `add` on
    // `/spec/<section>/tolerations` would fail when `/spec/<section>` does not
    // exist, so add the whole section object instead.
    if (!sectionSpec) {
      return [
        {
          op: 'add' as const,
          path: `/spec/${section}`,
          value: { tolerations: mergedTolerations },
        },
      ];
    }
    return [
      {
        op: sectionSpec.tolerations ? ('replace' as const) : ('add' as const),
        path: `/spec/${section}/tolerations`,
        value: mergedTolerations,
      },
    ];
  });

  // Nothing new to tolerate across any section -> leave the CR untouched.
  if (patch.length === 0) {
    return () => Promise.resolve();
  }

  return () =>
    k8sPatchByName(ClusterModel, IBM_SCALE_LOCAL_CLUSTER_NAME, null, patch);
};

const labelUserWorkloadMonitoringNamespace = (): Promise<unknown> => {
  const patch: Patch[] = [
    {
      op: 'add',
      path: '/metadata/labels/scale.spectrum.ibm.com~1networkpolicy',
      value: 'allow',
    },
  ];
  return k8sPatch({
    model: NamespaceModel,
    resource: {
      metadata: {
        name: OPENSHIFT_USER_WORKLOAD_MONITORING_NAMESPACE,
      },
    },
    data: patch,
  });
};

const removeClusterMonitoringLabel = (): Promise<unknown> => {
  const patch: Patch[] = [
    {
      op: 'remove',
      path: '/metadata/labels/openshift.io~1cluster-monitoring',
    },
  ];
  return k8sPatch({
    model: NamespaceModel,
    resource: {
      metadata: {
        name: IBM_SCALE_NAMESPACE,
      },
    },
    data: patch,
  });
};

export const configureMetricsNamespaceLabels = async (): Promise<void> => {
  await labelUserWorkloadMonitoringNamespace();
  try {
    await removeClusterMonitoringLabel();
  } catch {
    // Label may not exist, ignore
  }
};
