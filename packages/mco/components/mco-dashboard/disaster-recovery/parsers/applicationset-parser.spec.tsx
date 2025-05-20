import {
  ACMPlacementDecisionModel,
  ACMPlacementModel,
  ArgoApplicationSetModel,
  DRClusterModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '@odf/shared';
import { renderHook } from '@testing-library/react-hooks';
import { PLACEMENT_REF_LABEL } from '../../../../constants';
import { ArgoApplicationSetResourceKind } from '../../../../hooks';
import { DisasterRecoveryResourceKind } from '../../../../hooks/disaster-recovery';
import {
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  ArgoApplicationSetKind,
  DRClusterKind,
  DRPlacementControlKind,
  DRPolicyKind,
} from '../../../../types';
import { createRefFromK8Resource } from '../../../../utils';
import { useApplicationSetParser } from './applicationset-parser';

let isUnProtectedApplicationTestCase = true;

const mockApplicationSet1: ArgoApplicationSetKind = {
  apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
  kind: ArgoApplicationSetModel.kind,
  metadata: {
    name: 'mock-appset-1',
    namespace: 'mock-appset-1',
  },
  spec: {
    generators: [
      {
        clusterDecisionResource: {
          labelSelector: {
            matchLabels: {
              [PLACEMENT_REF_LABEL]: 'mock-placement-1',
            },
          },
        },
      },
    ],
    template: {
      spec: {
        destination: {
          namespace: 'mock-appset-1',
        },
      },
    },
  },
};

const mockApplicationSet2: ArgoApplicationSetKind = {
  apiVersion: `${ArgoApplicationSetModel.apiGroup}/${ArgoApplicationSetModel.apiVersion}`,
  kind: ArgoApplicationSetModel.kind,
  metadata: {
    name: 'mock-appset-2',
    namespace: 'mock-appset-2',
  },
  spec: {
    generators: [
      {
        clusterDecisionResource: {
          labelSelector: {
            matchLabels: {
              [PLACEMENT_REF_LABEL]: 'mock-placement-2',
            },
          },
        },
      },
    ],
    template: {
      spec: {
        destination: {
          namespace: 'mock-appset-2',
        },
      },
    },
  },
};

const mockPlacement1: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'mock-placement-1',
    namespace: 'mock-appset-1',
  },
  spec: {},
};

const mockPlacement2: ACMPlacementKind = {
  apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
  kind: ACMPlacementModel.kind,
  metadata: {
    name: 'mock-placement-2',
    namespace: 'mock-appset-2',
  },
  spec: {},
};

const mockPlacementDecision1: ACMPlacementDecisionKind = {
  apiVersion: `${ACMPlacementDecisionModel.apiGroup}/${ACMPlacementDecisionModel.apiVersion}`,
  kind: ACMPlacementDecisionModel.kind,
  metadata: {
    name: 'mock-placement-decision-1',
    namespace: 'mock-appset-1',
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
    namespace: 'mock-appset-2',
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
    S3ProfileName: '',
  },
};

const mockDRPC1: DRPlacementControlKind = {
  apiVersion: `${DRPlacementControlModel.apiGroup}/${DRPlacementControlModel.apiVersion}`,
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: 'mock-placement-1-drpc',
    namespace: 'mock-appset-1',
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

const appResources1: ArgoApplicationSetResourceKind = {
  formattedResources: [
    {
      application: mockApplicationSet1,
      placements: [
        {
          placement: mockPlacement1,
          placementDecision: mockPlacementDecision1,
          drClusters: [mockDRClusterEast1, mockDRClusterWest1],
          drPlacementControl: mockDRPC1,
          drPolicy: mockDRPolicy1,
        },
      ],
      managedClusters: [],
      siblingApplications: [],
    },
  ],
};

const appResources2: ArgoApplicationSetResourceKind = {
  formattedResources: [
    {
      application: mockApplicationSet2,
      placements: [
        {
          placement: mockPlacement2,
          placementDecision: mockPlacementDecision2,
        },
      ],
      managedClusters: [],
      siblingApplications: [],
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

jest.mock('@odf/mco/hooks/argo-application-set', () => ({
  __esModule: true,
  useArgoApplicationSetResourceWatch: jest.fn(() => {
    if (isUnProtectedApplicationTestCase) {
      return [appResources2, true, ''];
    } else {
      return [appResources1, true, ''];
    }
  }),
}));

describe('useApplicationSetParser', () => {
  test('Application count with unprotected applications', async () => {
    const { result } = renderHook(() =>
      useApplicationSetParser(
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
    expect(loadError).toBe('');
  });

  test('Protected application and its placement information', async () => {
    isUnProtectedApplicationTestCase = false;

    const { result } = renderHook(() =>
      useApplicationSetParser(
        managedClusters,
        managedClusterLoaded,
        managedClusterLoadError
      )
    );
    const [drClusterAppsMap] = result.current;
    expect(Object.keys(drClusterAppsMap)).toEqual(['east-1', 'west-1']);
    expect(drClusterAppsMap['east-1'].protectedApps[0].appName).toBe(
      'mock-appset-1'
    );
    expect(drClusterAppsMap['east-1'].protectedApps[0].appType).toBe(
      'ApplicationSet'
    );
    expect(
      drClusterAppsMap['east-1'].protectedApps[0].placementControlInfo
    ).toEqual([
      {
        deploymentClusterName: 'east-1',
        drpcName: 'mock-placement-1-drpc',
        drpcNamespace: 'mock-appset-1',
        failoverCluster: undefined,
        lastVolumeGroupSyncTime: '2023-06-06T17:50:56Z',
        preferredCluster: undefined,
        protectedPVCs: [],
        replicationType: 'async',
        status: 'Relocating',
        volumeSyncInterval: '5m',
        workloadNamespaces: ['mock-appset-1'],
      },
    ]);
    // Checking the total app count and protected app coun
    expect(drClusterAppsMap['east-1'].totalManagedAppsCount).toBe(1);
    expect(drClusterAppsMap['east-1'].protectedApps).toHaveLength(1);
    expect(drClusterAppsMap['east-1'].totalDiscoveredAppsCount).toBeUndefined();
  });
});
