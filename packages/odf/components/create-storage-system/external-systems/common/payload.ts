import { IBM_SCALE_LOCAL_CLUSTER_NAME } from '@odf/core/constants';
import { ClusterKind } from '@odf/core/types/scale';
import { NodeModel, ClusterModel } from '@odf/shared';
import { k8sPatchByName } from '@odf/shared/utils';
import {
  K8sKind,
  Patch,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../../reducer';

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

export const createScaleLocalClusterPayload = () => {
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
      license: {
        accept: true,
        license: 'data-management',
      },
      site: {
        name: '',
        zone: '',
      },
    },
  };
  return () => k8sCreate({ model: ClusterModel, data: payload });
};
