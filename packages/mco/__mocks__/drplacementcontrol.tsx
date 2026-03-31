import { DRPlacementControlModel } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION } from '../constants';
import { DRPlacementControlKind, Progression, Phase } from '../types';
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
    phase: Phase.Deployed,
    progression: Progression.WaitOnUserToCleanUp,
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
    phase: Phase.Deployed,
    lastGroupSyncTime: '2023-06-06T17:50:56Z',
  },
};

export const mockDRPC3: DRPlacementControlKind = {
  apiVersion: `${DRPlacementControlModel.apiGroup}/${DRPlacementControlModel.apiVersion}`,
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: 'mock-drpc-3',
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
    phase: Phase.Deployed,
    progression: Progression.WaitOnUserToCleanUp,
    lastGroupSyncTime: new Date().toISOString(),
  },
};
