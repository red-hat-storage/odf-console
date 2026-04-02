import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { renderHook } from '@testing-library/react-hooks';
import { DRPlacementControlKind, Phase, Progression } from '../types';
import { useActiveDROperations } from './useActiveDROperations';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
}));

jest.mock('./mco-resources', () => ({
  getDRPlacementControlResourceObj: jest.fn(() => ({
    kind: 'DRPlacementControl',
    isList: true,
  })),
  getProtectedApplicationViewResourceObj: jest.fn(() => ({
    kind: 'ProtectedApplicationView',
    isList: true,
  })),
}));

jest.mock('@odf/shared/selectors', () => ({
  getName: jest.fn((obj) => obj?.metadata?.name),
  getNamespace: jest.fn((obj) => obj?.metadata?.namespace),
}));

jest.mock('./useDRPoliciesByClusterPair', () => ({
  createClusterPairKey: jest.fn((c1, c2) => [c1, c2].sort().join('::')),
}));

const mockUseK8sWatchResource = useK8sWatchResource as jest.MockedFunction<
  typeof useK8sWatchResource
>;

const createMockPAV = (drpcName: string, primaryCluster?: string) => ({
  metadata: { name: `app-${drpcName}` },
  spec: { drpcRef: { name: drpcName } },
  status: { drInfo: { primaryCluster: primaryCluster || 'cluster1' } },
});

const createMockDRPC = (
  name: string,
  overrides?: Partial<DRPlacementControlKind>
): DRPlacementControlKind => {
  const base: DRPlacementControlKind = {
    apiVersion: 'ramendr.openshift.io/v1alpha1',
    kind: 'DRPlacementControl',
    metadata: {
      name,
      namespace: 'default',
      labels: {
        'app.kubernetes.io/name': 'test-app',
      },
    },
    spec: {
      drPolicyRef: { name: 'dr-policy-1' },
      placementRef: { name: 'placement-1', kind: 'Placement' },
      pvcSelector: {},
      preferredCluster: 'cluster1',
      action: 'Relocate' as any,
    },
    status: {
      phase: Phase.Relocating,
      progression: Progression.WaitOnUserToCleanUp,
      actionStartTime: new Date().toISOString(),
    },
  };
  return { ...base, ...overrides } as DRPlacementControlKind;
};

describe('useActiveDROperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should return loading state initially', () => {
      mockUseK8sWatchResource
        .mockReturnValueOnce([[], false, null]) // PAVs
        .mockReturnValueOnce([[], false, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [, loaded] = result.current;
      expect(loaded).toBe(false);
    });

    it('should return loaded when both resources are loaded', () => {
      mockUseK8sWatchResource
        .mockReturnValueOnce([[], true, null]) // PAVs
        .mockReturnValueOnce([[], true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [, loaded] = result.current;
      expect(loaded).toBe(true);
    });
  });

  describe('Active Operation Detection', () => {
    it('should detect active operation with progression', () => {
      const mockPAV = createMockPAV('drpc-1', 'cluster1');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Failover' as any,
            failoverCluster: 'cluster2',
          },
          status: {
            phase: Phase.FailingOver,
            progression: Progression.WaitOnUserToCleanUp,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      expect(Object.keys(operationsMap).length).toBeGreaterThan(0);
    });

    it('should detect active operation in Initiating phase', () => {
      const mockPAV = createMockPAV('drpc-1', 'cluster2');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Relocate' as any,
          },
          status: {
            phase: Phase.Initiating,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      expect(Object.keys(operationsMap).length).toBeGreaterThan(0);
    });

    it('should ignore completed operations', () => {
      const mockPAV = createMockPAV('drpc-1');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          status: {
            phase: Phase.Relocated,
            progression: Progression.Completed,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      expect(Object.keys(operationsMap)).toHaveLength(0);
    });
  });

  describe('Cluster Pair Grouping', () => {
    it('should group operations by cluster pair', () => {
      const mockPAV = createMockPAV('drpc-1', 'cluster1');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Failover' as any,
            failoverCluster: 'cluster2',
          },
          status: {
            phase: Phase.FailingOver,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const pairKey = Object.keys(operationsMap)[0];

      // Pair key should be alphabetically sorted
      expect(pairKey).toMatch(/cluster1::cluster2|cluster2::cluster1/);
    });

    it('should group multiple operations for same cluster pair', () => {
      const mockPAVs = [
        createMockPAV('drpc-app1', 'cluster1'),
        createMockPAV('drpc-app2', 'cluster1'),
      ];

      const mockDRPCs = [
        createMockDRPC('drpc-app1', {
          metadata: {
            name: 'drpc-app1',
            namespace: 'default',
            labels: { 'app.kubernetes.io/name': 'app1' },
          },
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Failover' as any,
            failoverCluster: 'cluster2',
          },
          status: {
            phase: Phase.FailingOver,
          },
        }),
        createMockDRPC('drpc-app2', {
          metadata: {
            name: 'drpc-app2',
            namespace: 'default',
            labels: { 'app.kubernetes.io/name': 'app2' },
          },
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Failover' as any,
            failoverCluster: 'cluster2',
          },
          status: {
            phase: Phase.Relocating,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([mockPAVs, true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operations = Object.values(operationsMap)[0];
      expect(operations).toHaveLength(2);
    });
  });

  describe('Source and Target Cluster Detection', () => {
    it('should identify source cluster from PAV primaryCluster for failover', () => {
      const mockPAV = createMockPAV('drpc-1', 'cluster1');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Failover' as any,
            failoverCluster: 'cluster2',
          },
          status: {
            phase: Phase.FailingOver,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];
      expect(operation.sourceCluster).toBe('cluster1');
    });

    it('should identify target cluster from failoverCluster for failover', () => {
      const mockPAV = createMockPAV('drpc-1', 'cluster1');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Failover' as any,
            failoverCluster: 'cluster2',
          },
          status: {
            phase: Phase.Relocating,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];
      expect(operation.targetCluster).toBe('cluster2');
    });
  });

  describe('Operation Details', () => {
    it('should extract application name from PAV', () => {
      const mockPAV = createMockPAV('drpc-1');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Failover' as any,
            failoverCluster: 'cluster2',
          },
          status: {
            phase: Phase.FailingOver,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];
      expect(operation.applicationName).toBe('app-drpc-1');
    });

    it('should include action, phase, and progression', () => {
      const mockPAV = createMockPAV('drpc-1', 'cluster1');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Failover' as any,
            failoverCluster: 'cluster2',
          },
          status: {
            phase: Phase.FailingOver,
            progression: Progression.WaitOnUserToCleanUp,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];

      expect(operation.action).toBeDefined();
      expect(operation.phase).toBe('FailingOver');
      expect(operation.progression).toBe(Progression.WaitOnUserToCleanUp);
    });

    it('should include actionStartTime when available', () => {
      const startTime = new Date().toISOString();
      const mockPAV = createMockPAV('drpc-1', 'cluster2');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            action: 'Relocate' as any,
          },
          status: {
            phase: Phase.Relocating,
            actionStartTime: startTime,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];
      expect(operation.actionStartTime).toBe(startTime);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty DRPC list', () => {
      mockUseK8sWatchResource
        .mockReturnValueOnce([[], true, null]) // PAVs
        .mockReturnValueOnce([[], true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      expect(operationsMap).toEqual({});
    });

    it('should handle DRPCs without action', () => {
      const mockPAV = createMockPAV('drpc-1');
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: {
            drPolicyRef: { name: 'dr-policy-1' },
            placementRef: { name: 'placement-1', kind: 'Placement' },
            pvcSelector: {},
            preferredCluster: 'cluster1',
            // No action specified
          },
          status: {
            phase: Phase.Initiating,
          },
        }),
      ];

      mockUseK8sWatchResource
        .mockReturnValueOnce([[mockPAV], true, null]) // PAVs
        .mockReturnValueOnce([mockDRPCs, true, null]); // DRPCs

      const { result } = renderHook(() => useActiveDROperations());

      // Should handle gracefully - no operations without action
      expect(result.current).toBeDefined();
      expect(Object.keys(result.current[0])).toHaveLength(0);
    });

    it('should handle error state', () => {
      const mockError = new Error('Failed to watch DRPCs');
      mockUseK8sWatchResource
        .mockReturnValueOnce([[], false, null]) // PAVs
        .mockReturnValueOnce([[], false, mockError]); // DRPCs with error

      const { result } = renderHook(() => useActiveDROperations());

      const [, , error] = result.current;
      expect(error).toBe(mockError);
    });
  });
});
