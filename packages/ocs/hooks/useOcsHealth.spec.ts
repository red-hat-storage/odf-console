import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import {
  HealthState,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { renderHook } from '@testing-library/react-hooks';
import * as utils from '../utils';
import { useGetOCSHealth } from './useOcsHealth';

// Mock dependencies
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(),
}));

jest.mock('@odf/shared/hooks/custom-prometheus-poll', () => ({
  useCustomPrometheusPoll: jest.fn(),
  usePrometheusBasePath: jest.fn(() => ''),
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: jest.fn(() => ({
    t: (key) => key,
  })),
}));

// Mock utility functions
jest.mock('../utils', () => ({
  getCephHealthState: jest.fn(),
  getRGWHealthState: jest.fn(),
  getNooBaaState: jest.fn(),
}));

const mockStorageCluster = {
  apiVersion: 'ocs.openshift.io/v1',
  kind: 'StorageCluster',
  metadata: {
    name: 'test-cluster',
    namespace: 'openshift-storage',
  },
  spec: {},
  status: {},
};

const mockCephCluster = {
  apiVersion: 'ceph.rook.io/v1',
  kind: 'CephCluster',
  metadata: {
    name: 'ocs-storagecluster-cephcluster',
    namespace: 'openshift-storage',
  },
  status: {
    ceph: {
      health: 'HEALTH_OK',
    },
  },
};

const mockCephObjectStore = {
  apiVersion: 'ceph.rook.io/v1',
  kind: 'CephObjectStore',
  metadata: {
    name: 'ocs-storagecluster-cephobjectstore',
    namespace: 'openshift-storage',
  },
  status: {
    phase: 'Connected',
  },
};

const mockNoobaaSystem = {
  apiVersion: 'noobaa.io/v1alpha1',
  kind: 'NooBaa',
  metadata: {
    name: 'noobaa',
    namespace: 'openshift-storage',
  },
  status: {},
};

const createPrometheusResponse = (value) => {
  const result = {
    metric: {},
    value: [1712304917.483, value],
  };
  const data = {
    result: [result],
    resultType: 'vector',
  };
  return {
    status: 'success',
    data,
  };
};

describe('useGetOCSHealth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Healthy scenarios', () => {
    it('returns OK when all subsystems are healthy', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null]) // cephData
        .mockReturnValueOnce([[mockCephObjectStore], true, null]) // cephObjData
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]); // noobaaData

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
      expect(result.current.message).toBe('Healthy');
    });

    it('returns OK when Ceph is LOADING (acceptable state)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.LOADING,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
      expect(result.current.message).toBe('Healthy');
    });

    it('returns OK when RGW is NOT_AVAILABLE (acceptable state)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
      expect(result.current.message).toBe('Healthy');
    });

    it('returns OK when MCG is UPDATING (acceptable state)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.UPDATING,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
      expect(result.current.message).toBe('Healthy');
    });
  });

  describe('Unhealthy scenarios', () => {
    it('returns ERROR when Ceph is unhealthy', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('returns ERROR when RGW is in ERROR state', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('returns ERROR when MCG is in ERROR state', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('1'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('returns ERROR when both RGW and MCG are unhealthy', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('1'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('returns ERROR when all subsystems are unhealthy', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('1'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('returns ERROR when Ceph is in WARNING state (unacceptable)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.WARNING,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('returns ERROR when MCG is in WARNING state (unacceptable)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('2'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.WARNING,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });
  });

  describe('Resource matching by namespace', () => {
    it('filters Ceph cluster by namespace', () => {
      const otherNamespaceCeph = {
        ...mockCephCluster,
        metadata: { ...mockCephCluster.metadata, namespace: 'other-namespace' },
      };

      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([
          [mockCephCluster, otherNamespaceCeph],
          true,
          null,
        ])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      renderHook(() => useGetOCSHealth(mockStorageCluster as any));

      expect(utils.getCephHealthState).toHaveBeenCalledWith(
        expect.objectContaining({
          ceph: expect.objectContaining({
            data: mockCephCluster,
          }),
        }),
        expect.any(Function)
      );
    });

    it('filters CephObjectStore by namespace', () => {
      const otherNamespaceRGW = {
        ...mockCephObjectStore,
        metadata: {
          ...mockCephObjectStore.metadata,
          namespace: 'other-namespace',
        },
      };

      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([
          [mockCephObjectStore, otherNamespaceRGW],
          true,
          null,
        ])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      renderHook(() => useGetOCSHealth(mockStorageCluster as any));

      expect(utils.getRGWHealthState).toHaveBeenCalledWith(mockCephObjectStore);
    });

    it('filters Noobaa by namespace', () => {
      const otherNamespaceNoobaa = {
        ...mockNoobaaSystem,
        metadata: {
          ...mockNoobaaSystem.metadata,
          namespace: 'other-namespace',
        },
      };

      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([
          [mockNoobaaSystem, otherNamespaceNoobaa],
          true,
          null,
        ]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      renderHook(() => useGetOCSHealth(mockStorageCluster as any));

      expect(utils.getNooBaaState).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Function),
        expect.objectContaining({
          data: [mockNoobaaSystem, otherNamespaceNoobaa],
        })
      );
    });
  });

  describe('Edge cases - missing resources', () => {
    it('returns OK when no CephObjectStore exists (RGW N/A)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[], true, null]) // no CephObjectStore
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
      expect(result.current.message).toBe('Healthy');
    });

    it('returns OK when no NooBaa exists (MCG N/A)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[], true, null]); // no NooBaa

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
      expect(result.current.message).toBe('Healthy');
      expect(utils.getNooBaaState).not.toHaveBeenCalled();
    });

    it('handles CephObjectStore not found in namespace (undefined)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([
          [
            {
              ...mockCephObjectStore,
              metadata: {
                ...mockCephObjectStore.metadata,
                namespace: 'different-namespace',
              },
            },
          ],
          true,
          null,
        ])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(utils.getRGWHealthState).toHaveBeenCalledWith(undefined);
      expect(result.current.healthState).toBe(HealthState.OK);
    });

    it('handles NooBaa not found in namespace (undefined)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([
          [
            {
              ...mockNoobaaSystem,
              metadata: {
                ...mockNoobaaSystem.metadata,
                namespace: 'different-namespace',
              },
            },
          ],
          true,
          null,
        ]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(utils.getNooBaaState).not.toHaveBeenCalled();
      expect(result.current.healthState).toBe(HealthState.OK);
    });
  });

  describe('Edge cases - load errors', () => {
    it('handles CephCluster load error', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[], false, new Error('Failed to load')])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
    });

    it('handles CephObjectStore load error (RGW becomes N/A)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[], false, new Error('Failed to load')])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(utils.getRGWHealthState).not.toHaveBeenCalled();
      expect(result.current.healthState).toBe(HealthState.OK);
    });

    it('handles NooBaa load error', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[], false, new Error('Failed to load')]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
    });

    it('handles Prometheus query error', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        null,
        new Error('Query failed'),
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
    });

    it('returns UNKNOWN when all resources have network errors', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[], false, new Error('Network error')])
        .mockReturnValueOnce([[], false, new Error('Network error')])
        .mockReturnValueOnce([[], false, new Error('Network error')]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.UNKNOWN);
      expect(result.current.message).toBe('Unknown');
      expect(utils.getCephHealthState).not.toHaveBeenCalled();
      expect(utils.getRGWHealthState).not.toHaveBeenCalled();
      expect(utils.getNooBaaState).not.toHaveBeenCalled();
    });

    it('returns UNKNOWN when some resources have network errors and others not loaded', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[], false, new Error('Network error')])
        .mockReturnValueOnce([[], false, new Error('Network error')])
        .mockReturnValueOnce([[], false, null]); // Not loaded but no error

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      // Should be LOADING because noobaa is still loading (no error)
      expect(result.current.healthState).toBe(HealthState.LOADING);
      expect(result.current.message).toBe('Loading');
    });
  });

  describe('Edge cases - not loaded yet', () => {
    it('returns LOADING when CephCluster not loaded yet', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[], false, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.LOADING);
      expect(result.current.message).toBe('Loading');
      expect(utils.getCephHealthState).not.toHaveBeenCalled();
    });

    it('returns LOADING when CephObjectStore not loaded yet', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[], false, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.LOADING);
      expect(result.current.message).toBe('Loading');
      expect(utils.getRGWHealthState).not.toHaveBeenCalled();
    });

    it('returns LOADING when NooBaa not loaded yet', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[], false, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.LOADING);
      expect(result.current.message).toBe('Loading');
      expect(utils.getNooBaaState).not.toHaveBeenCalled();
    });

    it('returns LOADING when all resources are not loaded yet', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[], false, null])
        .mockReturnValueOnce([[], false, null])
        .mockReturnValueOnce([[], false, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.LOADING);
      expect(result.current.message).toBe('Loading');
      expect(utils.getCephHealthState).not.toHaveBeenCalled();
      expect(utils.getRGWHealthState).not.toHaveBeenCalled();
      expect(utils.getNooBaaState).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases - empty or null data', () => {
    it('handles null CephCluster data', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([null, true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
    });

    it('handles empty array for all resources', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[], true, null])
        .mockReturnValueOnce([[], true, null])
        .mockReturnValueOnce([[], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.NOT_AVAILABLE,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.OK);
      expect(utils.getNooBaaState).not.toHaveBeenCalled();
    });

    it('handles undefined CephCluster in namespace', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.UNKNOWN,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });
  });

  describe('Mixed health states', () => {
    it('returns ERROR when block/file is OK but object is ERROR', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('1'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('returns ERROR when block/file is ERROR but object is OK', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('handles PROGRESS state for RGW (unacceptable)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.PROGRESS,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });

    it('handles UNKNOWN state for MCG (unacceptable)', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.UNKNOWN,
      });

      const { result } = renderHook(() =>
        useGetOCSHealth(mockStorageCluster as any)
      );

      expect(result.current.healthState).toBe(HealthState.ERROR);
      expect(result.current.message).toBe('Unhealthy');
    });
  });

  describe('Memoization and dependency tracking', () => {
    it('recomputes when CephCluster data changes', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.ERROR,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      renderHook(() => useGetOCSHealth(mockStorageCluster as any));

      expect(utils.getCephHealthState).toHaveBeenCalled();
    });

    it('passes correct arguments to utility functions', () => {
      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      const promResponse = createPrometheusResponse('0');
      const promError = null;

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        promResponse,
        promError,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      renderHook(() => useGetOCSHealth(mockStorageCluster as any));

      expect(utils.getCephHealthState).toHaveBeenCalledWith(
        {
          ceph: {
            data: mockCephCluster,
            loaded: true,
            loadError: null,
          },
        },
        expect.any(Function)
      );

      expect(utils.getRGWHealthState).toHaveBeenCalledWith(mockCephObjectStore);

      expect(utils.getNooBaaState).toHaveBeenCalledWith(
        [
          {
            response: promResponse,
            error: promError,
          },
        ],
        expect.any(Function),
        {
          loaded: true,
          loadError: null,
          data: [mockNoobaaSystem],
        }
      );
    });
  });

  describe('StorageCluster with different namespaces', () => {
    it('works with custom namespace', () => {
      const customStorageCluster = {
        ...mockStorageCluster,
        metadata: {
          ...mockStorageCluster.metadata,
          namespace: 'custom-namespace',
        },
      };

      const customCeph = {
        ...mockCephCluster,
        metadata: {
          ...mockCephCluster.metadata,
          namespace: 'custom-namespace',
        },
      };

      (useK8sWatchResource as jest.Mock)
        .mockReturnValueOnce([[customCeph, mockCephCluster], true, null])
        .mockReturnValueOnce([[mockCephObjectStore], true, null])
        .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        createPrometheusResponse('0'),
        null,
      ]);

      (utils.getCephHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getRGWHealthState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      (utils.getNooBaaState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
      });

      renderHook(() => useGetOCSHealth(customStorageCluster as any));

      expect(utils.getCephHealthState).toHaveBeenCalledWith(
        expect.objectContaining({
          ceph: expect.objectContaining({
            data: customCeph,
          }),
        }),
        expect.any(Function)
      );
    });
  });

  describe('All acceptable health states', () => {
    const acceptableStates = [
      HealthState.OK,
      HealthState.LOADING,
      HealthState.UPDATING,
      HealthState.NOT_AVAILABLE,
    ];

    acceptableStates.forEach((state) => {
      it(`returns OK when all subsystems are in ${state} state`, () => {
        (useK8sWatchResource as jest.Mock)
          .mockReturnValueOnce([[mockCephCluster], true, null])
          .mockReturnValueOnce([[mockCephObjectStore], true, null])
          .mockReturnValueOnce([[mockNoobaaSystem], true, null]);

        (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
          createPrometheusResponse('0'),
          null,
        ]);

        (utils.getCephHealthState as jest.Mock).mockReturnValue({
          state,
        });

        (utils.getRGWHealthState as jest.Mock).mockReturnValue({
          state,
        });

        (utils.getNooBaaState as jest.Mock).mockReturnValue({
          state,
        });

        const { result } = renderHook(() =>
          useGetOCSHealth(mockStorageCluster as any)
        );

        expect(result.current.healthState).toBe(HealthState.OK);
        expect(result.current.message).toBe('Healthy');
      });
    });
  });
});
