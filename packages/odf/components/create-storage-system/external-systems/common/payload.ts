import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  IBM_SCALE_NAMESPACE,
  SCALE_DAEMON_NODE_LABEL,
} from '@odf/core/constants';
import { ClusterKind } from '@odf/core/types/scale';
import {
  ClusterModel,
  NamespaceModel,
  NodeModel,
  OPENSHIFT_USER_WORKLOAD_MONITORING_NAMESPACE,
} from '@odf/shared';
import { k8sPatchByName } from '@odf/shared/utils';
import {
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

const patchScaleNode = (node: WizardNodeState) => {
  const labelPath = `/metadata/labels/${SCALE_DAEMON_NODE_LABEL.replace('/', '~1')}`;
  const patch: Patch[] = [];
  if (!node.labels) {
    patch.push({
      op: 'add',
      path: '/metadata/labels',
      value: {},
    });
  }
  patch.push({
    op: 'add',
    path: labelPath,
    value: '',
  });
  return k8sPatchByName(NodeModel, node.name, null, patch);
};

export const labelNodes = (nodes: WizardNodeState[]) => {
  const requests = nodes
    .filter((node) => !node.labels?.[SCALE_DAEMON_NODE_LABEL])
    .map(patchScaleNode);
  return () => Promise.all(requests);
};

export const labelNodesSettled = async (nodes: WizardNodeState[]) => {
  const results = await Promise.allSettled(nodes.map(patchScaleNode));
  return results.reduce<{
    successfulNames: string[];
    failedNames: string[];
  }>(
    (acc, result, index) => {
      acc[
        result.status === 'fulfilled' ? 'successfulNames' : 'failedNames'
      ].push(nodes[index].name);
      return acc;
    },
    { successfulNames: [], failedNames: [] }
  );
};

export const createScaleLocalClusterPayload = (
  externalKmmRegistry?: ExternalKMMRegistryConfig,
  addClusterLabels?: boolean,
  addResourceLimits?: boolean,
  cpuLimit?: string,
  memoryLimit?: string
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
