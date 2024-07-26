import { getName } from '@odf/shared/selectors';
import { LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION } from '../constants';
import { DRPlacementControlModel } from '../models';
import { DRPlacementControlKind } from '../types';
import { createRefFromK8Resource } from '../utils';
import { mockDRClusterEast1 } from './drcluster';
import { mockDRPolicy1 } from './drpolicy';

export const mockDRPC1: DRPlacementControlKind = {
  apiVersion: `${DRPlacementControlModel.apiGroup}/${DRPlacementControlModel.apiVersion}`,
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: 'mock-drpc-1',
    namespace: 'test-ns',
    creationTimestamp: '2023-06-06T17:50:56Z',
    annotations: {
      [LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION]: getName(mockDRClusterEast1),
    },
  },
  spec: {
    drPolicyRef: createRefFromK8Resource(mockDRPolicy1),
    placementRef: {},
    pvcSelector: {
      matchLabels: {
        pvc: 'pvc1',
      },
    },
  },
  status: {
    conditions: [
      {
        type: 'PeerReady',
        status: 'True',
      },
      {
        type: 'Available',
        status: 'True',
      },
    ],
    phase: 'Deployed',
    progression: 'WaitOnUserToCleanUp',
    lastGroupSyncTime: '2023-06-06T17:50:56Z',
  },
};

export const mockDRPC2: DRPlacementControlKind = {
  apiVersion: `${DRPlacementControlModel.apiGroup}/${DRPlacementControlModel.apiVersion}`,
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: 'mock-drpc-1',
    namespace: 'test-ns',
    creationTimestamp: '2023-06-06T17:50:56Z',
    annotations: {
      [LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION]: getName(mockDRClusterEast1),
    },
  },
  spec: {
    drPolicyRef: createRefFromK8Resource(mockDRPolicy1),
    placementRef: {},
    pvcSelector: {
      matchLabels: {
        pvc: 'pvc1',
      },
    },
  },
  status: {
    conditions: [
      {
        type: 'PeerReady',
        status: 'False',
      },
      {
        type: 'Available',
        status: 'False',
      },
    ],
    phase: 'Deployed',
    lastGroupSyncTime: '2023-06-06T17:50:56Z',
  },
};
