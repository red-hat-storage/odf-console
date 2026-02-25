import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  IBM_SCALE_NAMESPACE,
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
  K8sKind,
  Patch,
  k8sCreate,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../reducer';

/** External KMM registry config from the SAN external registry form (when cluster has no persistent image registry) */
export type ExternalKMMRegistryConfig = {
  imageRegistryUrl: string;
  imageRepositoryName: string;
  secretKey: string;
  caCertificateSecret: string;
  privateKeySecret: string;
};

export const labelNodes = (nodes: WizardNodeState[]) => {
  const labelPath = `/metadata/labels/scale.spectrum.ibm.com~1daemon-selector`;
  const patch: Patch[] = [
    {
      op: 'add',
      path: '/metadata/labels',
      value: {},
    },
    {
      op: 'add',
      path: labelPath,
      value: '',
    },
  ];
  const requests: Promise<K8sKind>[] = [];
  nodes.forEach((node) => {
    if (!node.labels?.['scale.spectrum.ibm.com/daemon-selector/'])
      requests.push(k8sPatchByName(NodeModel, node.name, null, patch));
  });
  return () => Promise.all(requests);
};

export const createScaleLocalClusterPayload = (
  externalKmmRegistry?: ExternalKMMRegistryConfig
) => {
  const spec: ClusterKind['spec'] = {
    daemon: {
      nodeSelector: {
        'scale.spectrum.ibm.com/daemon-selector': '',
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
    spec.gpfsModuleManagement = {
      kmm: {
        imageRepository: {
          registry: externalKmmRegistry.imageRegistryUrl,
          repo: externalKmmRegistry.imageRepositoryName,
          registrySecret: externalKmmRegistry.secretKey,
        },
        moduleSigning: {
          keySecret: externalKmmRegistry.privateKeySecret,
          certSecret: externalKmmRegistry.caCertificateSecret,
        },
      },
    };
  }

  const payload: ClusterKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Cluster',
    metadata: {
      name: IBM_SCALE_LOCAL_CLUSTER_NAME,
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
