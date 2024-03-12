import { ApplicationKind } from '@odf/shared';
import { renderHook } from '@testing-library/react-hooks';
import { PLACEMENT_REF_LABEL } from '../../../../constants';
import { DisasterRecoveryResourceKind } from '../../../../hooks/disaster-recovery';
import {
  ACMPlacementDecisionModel,
  ACMPlacementModel,
  DRClusterModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '../../../../models';
import {
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  DRClusterKind,
  DRPlacementControlKind,
  DRPolicyKind,
} from '../../../../types';
import { createRefFromK8Resource } from '../../../../utils';
import { useSubscriptionParser } from './subscription-parser';

let isUnProtectedApplicationTestCase = true;

const mockPlacement1: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'sapp1-placement-1',
    namespace: 'default',
  },
  spec: {},
};

const mockPlacement2: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'sapp2-placement-1',
    namespace: 'default',
  },
  spec: {},
};

const mockPlacementDecision1: ACMPlacementDecisionKind = {
  apiVersion: `${ACMPlacementDecisionModel.apiGroup}/${ACMPlacementDecisionModel.apiVersion}`,
  kind: ACMPlacementDecisionModel.kind,
  metadata: {
    name: 'mock-placement-decision-1',
    namespace: 'mock-sapp1',
    labels: {
      [PLACEMENT_REF_LABEL]: 'mock-placement-1',
    },
  },
  status: {
    decisions: [
      {
        clusterName: 'east-1',
        reason: '',
      },
    ],
  },
};

const mockPlacementDecision2: ACMPlacementDecisionKind = {
  apiVersion: `${ACMPlacementDecisionModel.apiGroup}/${ACMPlacementDecisionModel.apiVersion}`,
  kind: ACMPlacementDecisionModel.kind,
  metadata: {
    name: 'mock-placement-decision-2',
    namespace: 'mock-sapp2',
    labels: {
      [PLACEMENT_REF_LABEL]: 'mock-placement-2',
    },
  },
  status: {
    decisions: [
      {
        clusterName: 'east-1',
        reason: '',
      },
    ],
  },
};

const mockSubscription1 = {
  kind: 'Subscription',
  metadata: {
    name: 'sapp1-subscription-1',
    namespace: 'default',
  },
};

const mockSubscription2 = {
  kind: 'Subscription',
  metadata: {
    name: 'sapp1-subscription-2',
    namespace: 'default',
  },
};

const mockSubscription3 = {
  kind: 'Subscription',
  metadata: {
    name: 'sapp1-subscription-3',
    namespace: 'default',
  },
};

const mockSubscriptionApp1: ApplicationKind = {
  kind: 'Application',
  metadata: {
    name: 'mock-sapp1',
    namespace: 'default',
  },
  spec: {
    componentKinds: [],
  },
};

const mockSubscriptionApp2: ApplicationKind = {
  kind: 'Application',
  metadata: {
    name: 'mock-sapp2',
    namespace: 'default',
  },
  spec: {
    componentKinds: [],
  },
};

const mockDRPolicy1: DRPolicyKind = {
  apiVersion: `${DRPolicyModel.apiGroup}/${DRPolicyModel.apiVersion}`,
  kind: DRPolicyModel.kind,
  metadata: {
    uid: '1',
    name: 'mock-policy-1',
  },
  spec: {
    drClusters: ['east-1', 'west-1'],
    schedulingInterval: '5m',
  },
  status: {
    phase: '',
    conditions: [
      {
        status: 'True',
        type: 'Validated',
      },
    ],
  },
};

const mockDRClusterEast1: DRClusterKind = {
  apiVersion: `${DRClusterModel.apiGroup}/${DRClusterModel.apiVersion}`,
  kind: DRClusterModel.kind,
  metadata: {
    name: 'east-1',
  },
  spec: {
    region: 'east-1',
    S3ProfileName: '',
  },
};

const mockDRClusterWest1: DRClusterKind = {
  apiVersion: `${DRClusterModel.apiGroup}/${DRClusterModel.apiVersion}`,
  kind: DRClusterModel.kind,
  metadata: {
    name: 'west-1',
  },
  spec: {
    region: 'west-1',
    S3ProfileName: '',
  },
};

const mockDRPC1: DRPlacementControlKind = {
  apiVersion: `${DRPlacementControlModel.apiGroup}/${DRPlacementControlModel.apiVersion}`,
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: 'mock-placement-1-drpc',
    namespace: 'default',
    creationTimestamp: '2023-06-06T17:50:56Z',
  },
  spec: {
    drPolicyRef: createRefFromK8Resource(mockDRPolicy1),
    placementRef: createRefFromK8Resource(mockPlacement1),
    pvcSelector: {
      matchLabels: {
        pvc: 'pvc1',
      },
    },
  },
  status: {
    phase: 'Relocating',
    lastGroupSyncTime: '2023-06-06T17:50:56Z',
  },
};

const drInfo1 = {
  drClusters: [mockDRClusterEast1, mockDRClusterWest1],
  drPolicy: mockDRPolicy1,
  drPlacementControl: mockDRPC1,
};

const drResources1: DisasterRecoveryResourceKind = {
  drClusters: [mockDRClusterEast1, mockDRClusterWest1],
  drPolicies: [mockDRPolicy1],
  drPlacementControls: [mockDRPC1],
  formattedResources: [
    {
      drClusters: [mockDRClusterEast1, mockDRClusterWest1],
      drPolicy: mockDRPolicy1,
      drPlacementControls: [mockDRPC1],
    },
  ],
};

const appResources1 = {
  application: mockSubscriptionApp1,
  subscriptionGroupInfo: [
    {
      placement: mockPlacement1,
      placementDecision: mockPlacementDecision1,
      subscriptions: [mockSubscription1],
    },
  ],
};

const appResources2 = {
  application: mockSubscriptionApp2,
  subscriptionGroupInfo: [
    {
      drInfo: drInfo1,
      placement: mockPlacement2,
      placementDecision: mockPlacementDecision2,
      subscriptions: [mockSubscription2, mockSubscription3],
    },
  ],
};

const managedClusters = [];
const managedClusterLoaded = true;
const managedClusterLoadError = null;

jest.mock('@odf/mco/hooks/disaster-recovery', () => ({
  __esModule: true,
  useDisasterRecoveryResourceWatch: jest.fn(() => {
    return [drResources1, true, ''];
  }),
}));

jest.mock('@odf/mco/hooks/subscription', () => ({
  __esModule: true,
  useSubscriptionResourceWatch: jest.fn(() => {
    if (isUnProtectedApplicationTestCase) {
      return [[appResources1], true, ''];
    } else {
      return [[appResources1, appResources2], true, ''];
    }
  }),
}));

describe('useApplicationSetParser', () => {
  test('Application count with unprotected applications', async () => {
    const { result } = renderHook(() =>
      useSubscriptionParser(
        managedClusters,
        managedClusterLoaded,
        managedClusterLoadError
      )
    );

    const [drClusterAppsMap, loaded, loadError] = result.current;
    expect(Object.keys(drClusterAppsMap)).toEqual(['east-1', 'west-1']);
    expect(drClusterAppsMap['east-1'].totalManagedAppsCount).toBe(1);
    expect(drClusterAppsMap['west-1'].totalManagedAppsCount).toBe(0);
    expect(loaded).toBe(true);
    expect(loadError).toBeNull();
  });

  test('Protected application and its placement information', async () => {
    isUnProtectedApplicationTestCase = false;
    const { result } = renderHook(() =>
      useSubscriptionParser(
        managedClusters,
        managedClusterLoaded,
        managedClusterLoadError
      )
    );
    const [drClusterAppsMap] = result.current;
    expect(Object.keys(drClusterAppsMap)).toEqual(['east-1', 'west-1']);
    expect(drClusterAppsMap['east-1'].protectedApps[0].appName).toBe(
      'mock-sapp2'
    );
    expect(drClusterAppsMap['east-1'].protectedApps[0].appType).toBe(
      'Subscription'
    );
    expect(
      drClusterAppsMap['east-1'].protectedApps[0].placementControlInfo
    ).toEqual([
      {
        deploymentClusterName: 'east-1',
        drpcName: 'mock-placement-1-drpc',
        drpcNamespace: 'default',
        failoverCluster: undefined,
        lastVolumeGroupSyncTime: '2023-06-06T17:50:56Z',
        preferredCluster: undefined,
        protectedPVCs: [],
        replicationType: 'async',
        status: 'Relocating',
        volumeSyncInterval: '5m',
        workloadNamespaces: ['default'],
        subscriptions: ['sapp1-subscription-2', 'sapp1-subscription-3'],
      },
    ]);
    // Checking the total app count and protected app count
    expect(drClusterAppsMap['east-1'].totalManagedAppsCount).toBe(2);
    expect(drClusterAppsMap['east-1'].protectedApps).toHaveLength(1);
    expect(drClusterAppsMap['east-1'].totalDiscoveredAppsCount).toBeUndefined();
  });
});
