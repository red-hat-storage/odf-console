import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { renderHook } from '@testing-library/react-hooks';
import { DRPlacementControlKind, Phase, Progression } from '../types';
import { useActiveDROperations } from './useActiveDROperations';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
}));

const mockUseK8sWatchResource = useK8sWatchResource as jest.MockedFunction<
  typeof useK8sWatchResource
>;

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
    },
    status: {
      phase: Phase.Relocating,
      progression: Progression.WaitOnUserToCleanUp,
      preferredDecision: { clusterName: 'cluster2' },
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
      mockUseK8sWatchResource.mockReturnValue([[], [], false, null, null]);

      const { result } = renderHook(() => useActiveDROperations());

      const [, loaded] = result.current;
      expect(loaded).toBe(false);
    });

    it('should return loaded when both resources are loaded', () => {
      mockUseK8sWatchResource.mockReturnValue([[], [], true, null, null]);

      const { result } = renderHook(() => useActiveDROperations());

      const [, loaded] = result.current;
      expect(loaded).toBe(true);
    });
  });

  describe('Active Operation Detection', () => {
    it('should detect active operation with progression', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          status: {
            phase: Phase.FailingOver,
            progression: Progression.WaitOnUserToCleanUp,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      expect(Object.keys(operationsMap).length).toBeGreaterThan(0);
    });

    it('should detect active operation in Initiating phase', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          status: {
            phase: Phase.Initiating,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      expect(Object.keys(operationsMap).length).toBeGreaterThan(0);
    });

    it('should ignore completed operations', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          status: {
            phase: Phase.Relocated,
            progression: Progression.Completed,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      expect(Object.keys(operationsMap)).toHaveLength(0);
    });
  });

  describe('Cluster Pair Grouping', () => {
    it('should group operations by cluster pair', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: { preferredCluster: 'cluster1' },
          status: {
            phase: Phase.FailingOver,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const pairKey = Object.keys(operationsMap)[0];

      // Pair key should be alphabetically sorted
      expect(pairKey).toMatch(/cluster1::cluster2|cluster2::cluster1/);
    });

    it('should group multiple operations for same cluster pair', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-app1', {
          metadata: {
            name: 'drpc-app1',
            labels: { 'app.kubernetes.io/name': 'app1' },
          },
          spec: { preferredCluster: 'cluster1' },
          status: {
            phase: Phase.FailingOver,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
        createMockDRPC('drpc-app2', {
          metadata: {
            name: 'drpc-app2',
            labels: { 'app.kubernetes.io/name': 'app2' },
          },
          spec: { preferredCluster: 'cluster1' },
          status: {
            phase: Phase.Relocating,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operations = Object.values(operationsMap)[0];
      expect(operations).toHaveLength(2);
    });
  });

  describe('Source and Target Cluster Detection', () => {
    it('should identify source cluster from spec.preferredCluster', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: { preferredCluster: 'cluster1' },
          status: {
            phase: Phase.FailingOver,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];
      expect(operation.sourceCluster).toBe('cluster1');
    });

    it('should identify target cluster from status.preferredDecision', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          spec: { preferredCluster: 'cluster1' },
          status: {
            phase: Phase.Relocating,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];
      expect(operation.targetCluster).toBe('cluster2');
    });
  });

  describe('Operation Details', () => {
    it('should extract application name from labels', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          metadata: {
            name: 'drpc-1',
            labels: { 'app.kubernetes.io/name': 'my-application' },
          },
          status: {
            phase: Phase.FailingOver,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];
      expect(operation.applicationName).toBe('my-application');
    });

    it('should include action, phase, and progression', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          status: {
            phase: Phase.FailingOver,
            progression: Progression.WaitOnUserToCleanUp,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];

      expect(operation.action).toBeDefined();
      expect(operation.phase).toBe('FailingOver');
      expect(operation.progression).toBe(Progression.WaitOnUserToCleanUp);
    });

    it('should include actionStartTime when available', () => {
      const startTime = new Date().toISOString();
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          status: {
            phase: Phase.Relocating,
            actionStartTime: startTime,
            preferredDecision: { clusterName: 'cluster2' },
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      const operation = Object.values(operationsMap)[0][0];
      expect(operation.actionStartTime).toBe(startTime);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty DRPC list', () => {
      mockUseK8sWatchResource.mockReturnValue([[], [], true, null, null]);

      const { result } = renderHook(() => useActiveDROperations());

      const [operationsMap] = result.current;
      expect(operationsMap).toEqual({});
    });

    it('should handle DRPCs without preferredDecision', () => {
      const mockDRPCs = [
        createMockDRPC('drpc-1', {
          status: {
            phase: Phase.Initiating,
            // No preferredDecision
          },
        }),
      ];

      mockUseK8sWatchResource.mockReturnValue([
        mockDRPCs,
        [],
        true,
        null,
        null,
      ]);

      const { result } = renderHook(() => useActiveDROperations());

      // Should handle gracefully
      expect(result.current).toBeDefined();
    });

    it('should handle error state', () => {
      const mockError = new Error('Failed to watch DRPCs');
      mockUseK8sWatchResource.mockReturnValue([[], [], false, mockError, null]);

      const { result } = renderHook(() => useActiveDROperations());

      const [, , error] = result.current;
      expect(error).toBe(mockError);
    });
  });
});
