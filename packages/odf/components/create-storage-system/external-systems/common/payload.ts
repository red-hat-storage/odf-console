import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  OPENSHIFT_USER_WORKLOAD_MONITORING_NAMESPACE,
} from '@odf/core/constants';
import { ClusterKind } from '@odf/core/types/scale';
import { ClusterModel, NamespaceModel, NodeModel } from '@odf/shared';
import { k8sPatchByName } from '@odf/shared/utils';
import {
  K8sKind,
  Patch,
  k8sCreate,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../reducer';

export const labelNodes = (nodes: WizardNodeState[]) => {
  const labelPath = `/metadata/labels/scale.spectrum.ibm.com~1daemon-selector`;
  const patch: Patch[] = [
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
  isEncryptionEnabled?: boolean
) => {
  const payload: ClusterKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Cluster',
    metadata: {
      name: IBM_SCALE_LOCAL_CLUSTER_NAME,
    },
    spec: {
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
        license: isEncryptionEnabled ? 'data-management' : 'data-access',
      },
    },
  };
  return () => k8sCreate({ model: ClusterModel, data: payload });
};

export const labelUserWorkloadMonitoringNamespace = () => {
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
