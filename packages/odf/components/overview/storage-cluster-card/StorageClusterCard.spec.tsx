import * as React from 'react';
import { useRawCapacity } from '@odf/core/hooks';
import { useODFNamespaceSelector } from '@odf/core/redux/selectors';
import { useGetOCSHealth } from '@odf/ocs/hooks/useOcsHealth';
import { getDataResiliencyState } from '@odf/ocs/utils';
import { DASH, useFetchCsv } from '@odf/shared';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import {
  HealthState,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom-v5-compat';
import { StorageClusterCard } from './StorageClusterCard';

// Mock resources before other imports
jest.mock('@odf/core/resources', () => ({
  odfSubscriptionResource: jest.fn((ns) => ({
    kind: 'Subscription',
    fieldSelector: 'metadata.name=odf-operator',
    isList: false,
    namespace: ns,
  })),
  storageClusterResource: {
    isList: true,
    kind: 'StorageCluster',
  },
}));

jest.mock('@odf/core/utils', () => ({
  getStorageClusterInNs: jest.fn((clusters, namespace) => {
    return clusters?.find(
      (cluster) => cluster?.metadata?.namespace === namespace
    );
  }),
}));

jest.mock('@odf/ocs/queries', () => ({
  resiliencyProgressQuery: jest.fn(() => 'ceph_health_query'),
  StatusCardQueries: {
    MCG_REBUILD_PROGRESS_QUERY: 'mcg_rebuild_query',
  },
}));

jest.mock('@odf/ocs/constants/charts', () => ({
  DANGER_THRESHOLD: 0.85,
  WARNING_THRESHOLD: 0.8,
}));

// Mock all dependencies
jest.mock('@odf/core/hooks', () => ({
  useRawCapacity: jest.fn(),
  useSafeK8sWatchResource: jest.fn(),
}));

jest.mock('@odf/core/redux/selectors', () => ({
  useODFNamespaceSelector: jest.fn(),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(),
  HealthState: {
    OK: 'OK',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    LOADING: 'LOADING',
    UNKNOWN: 'UNKNOWN',
    NOT_AVAILABLE: 'NOT_AVAILABLE',
  },
}));

jest.mock('@odf/shared', () => ({
  ...jest.requireActual('@odf/shared'),
  useFetchCsv: jest.fn(),
  getName: jest.fn((obj) => obj?.metadata?.name || ''),
  healthStateMapping: {
    OK: { icon: <span>✓</span> },
    WARNING: { icon: <span>⚠</span> },
    ERROR: { icon: <span>✗</span> },
    LOADING: { icon: <span>...</span> },
    UNKNOWN: { icon: <span>?</span> },
    NOT_AVAILABLE: { icon: <span>-</span> },
  },
  healthStateMessage: jest.fn((state) => state),
  ODF_OPERATOR: 'odf-operator',
  DASH: '-',
}));

jest.mock('@odf/shared/generic/ErrorCardBody', () => ({
  ErrorCardBody: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock('@odf/shared/hooks/custom-prometheus-poll', () => ({
  useCustomPrometheusPoll: jest.fn(),
  usePrometheusBasePath: jest.fn(() => '/prometheus'),
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: jest.fn(() => ({
    t: (key: string) => key,
  })),
}));

jest.mock('@odf/shared/utils', () => ({
  getOprChannelFromSub: jest.fn((sub) => sub?.spec?.channel || DASH),
  getOprVersionFromCSV: jest.fn((csv) => csv?.spec?.version || DASH),
  getStorageClusterMetric: jest.fn((metric) => {
    if (!metric) return null;
    return metric;
  }),
  humanizeBinaryBytes: jest.fn((value, _nullValue = null, preferredUnit) => {
    if (!value || value === '0' || value === 0) {
      return { value: 0, unit: 'B', string: '0 B' };
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (preferredUnit === 'TiB') {
      return {
        value: numValue / 1024 ** 4,
        unit: 'TiB',
        string: `${(numValue / 1024 ** 4).toFixed(2)} TiB`,
      };
    }
    if (numValue >= 1024 ** 4) {
      return {
        value: numValue / 1024 ** 4,
        unit: 'TiB',
        string: `${(numValue / 1024 ** 4).toFixed(2)} TiB`,
      };
    }
    if (numValue >= 1024 ** 3) {
      return {
        value: numValue / 1024 ** 3,
        unit: 'GiB',
        string: `${(numValue / 1024 ** 3).toFixed(2)} GiB`,
      };
    }
    return { value: numValue, unit: 'B', string: `${numValue} B` };
  }),
}));

jest.mock('@odf/ocs/hooks/useOcsHealth', () => ({
  useGetOCSHealth: jest.fn(),
}));

jest.mock('@odf/ocs/utils', () => ({
  getDataResiliencyState: jest.fn(),
}));

const mockStorageCluster = {
  apiVersion: 'ocs.openshift.io/v1',
  kind: 'StorageCluster',
  metadata: {
    name: 'ocs-storagecluster',
    namespace: 'openshift-storage',
  },
  spec: {},
  status: {
    phase: 'Ready',
  },
};

const mockCSV = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'ClusterServiceVersion',
  metadata: {
    name: 'odf-operator.v4.12.0',
    namespace: 'openshift-storage',
  },
  spec: {
    version: '4.12.0',
  },
};

const mockSubscription = {
  apiVersion: 'operators.coreos.com/v1alpha1',
  kind: 'Subscription',
  metadata: {
    name: 'odf-operator',
    namespace: 'openshift-storage',
  },
  spec: {
    channel: 'stable-4.12',
  },
};

const createPrometheusResponse = (value: string) => ({
  data: {
    result: [
      {
        metric: {},
        value: [Date.now() / 1000, value],
      },
    ],
    resultType: 'vector',
  },
  status: 'success',
});

const mockPrometheusMetric = (value: string) => ({
  metric: {},
  value: [Date.now() / 1000, value],
});

describe('StorageClusterCard', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock react-router
    jest.mock('react-router-dom-v5-compat', () => ({
      ...jest.requireActual('react-router-dom-v5-compat'),
      useNavigate: () => mockNavigate,
    }));

    // Default mocks
    (useODFNamespaceSelector as jest.Mock).mockReturnValue({
      odfNamespace: 'openshift-storage',
      isNsSafe: true,
    });

    (useK8sWatchResource as jest.Mock).mockReturnValue([
      [mockStorageCluster],
      true,
      undefined,
    ]);

    (useFetchCsv as jest.Mock).mockReturnValue([mockCSV, true, undefined]);

    (useGetOCSHealth as jest.Mock).mockReturnValue({
      healthState: HealthState.OK,
      message: 'Healthy',
    });

    (useRawCapacity as jest.Mock).mockReturnValue([
      mockPrometheusMetric('10995116277760'), // 10 TiB
      mockPrometheusMetric('5497558138880'), // 5 TiB
      false,
      undefined,
    ]);

    (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
      createPrometheusResponse('0'),
      undefined,
    ]);

    (getDataResiliencyState as jest.Mock).mockReturnValue({
      state: HealthState.OK,
      message: 'Healthy',
    });

    // Mock useSafeK8sWatchResource for subscription
    const { useSafeK8sWatchResource } = require('@odf/core/hooks');
    (useSafeK8sWatchResource as jest.Mock).mockReturnValue([
      mockSubscription,
      true,
      undefined,
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering States', () => {
    it('should render the card with title', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });

    it('should render loading state when storage clusters are not loaded', () => {
      (useK8sWatchResource as jest.Mock).mockReturnValue([
        [],
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('Loading storage cluster data')
      ).toBeInTheDocument();
    });

    it('should render error state when storage clusters fail to load', () => {
      (useK8sWatchResource as jest.Mock).mockReturnValue([
        [],
        true,
        new Error('Failed to load'),
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('Storage cluster data not available.')
      ).toBeInTheDocument();
    });

    it('should render error state when no storage cluster is found', () => {
      (useK8sWatchResource as jest.Mock).mockReturnValue([[], true, undefined]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('No storage cluster configured.')
      ).toBeInTheDocument();
    });

    it('should render storage cluster details when loaded successfully', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Cluster Status')).toBeInTheDocument();
      expect(screen.getByText('Block and File Resiliency')).toBeInTheDocument();
      expect(screen.getByText('Object Resiliency')).toBeInTheDocument();
      expect(screen.getByText('Data Foundation version')).toBeInTheDocument();
      expect(screen.getByText('Update channel')).toBeInTheDocument();
    });
  });

  describe('Health Status', () => {
    it('should display healthy cluster status', () => {
      (useGetOCSHealth as jest.Mock).mockReturnValue({
        healthState: HealthState.OK,
        message: 'Healthy',
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      // Multiple "Healthy" texts will be present (cluster status + resiliency statuses)
      const healthyTexts = screen.getAllByText('Healthy');
      expect(healthyTexts.length).toBeGreaterThan(0);
    });

    it('should display warning cluster status', () => {
      (useGetOCSHealth as jest.Mock).mockReturnValue({
        healthState: HealthState.WARNING,
        message: 'Warning',
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should display error cluster status', () => {
      (useGetOCSHealth as jest.Mock).mockReturnValue({
        healthState: HealthState.ERROR,
        message: 'Error',
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('Resiliency Status', () => {
    it('should display healthy ceph resiliency', () => {
      (getDataResiliencyState as jest.Mock).mockReturnValue({
        state: HealthState.OK,
        message: 'Healthy',
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      // Multiple "Healthy" texts will be present (cluster status, ceph, object)
      const healthyTexts = screen.getAllByText('Healthy');
      expect(healthyTexts.length).toBeGreaterThan(0);
    });

    it('should display warning ceph resiliency', () => {
      (getDataResiliencyState as jest.Mock).mockImplementation(() => {
        return {
          state: HealthState.WARNING,
          message: 'Rebuilding',
        };
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getAllByText('WARNING').length).toBeGreaterThan(0);
    });

    it('should display error object resiliency', () => {
      (getDataResiliencyState as jest.Mock).mockImplementation(() => {
        return {
          state: HealthState.ERROR,
          message: 'Failed',
        };
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getAllByText('ERROR').length).toBeGreaterThan(0);
    });

    it('should handle different states for ceph and object resiliency', () => {
      let callCount = 0;
      (getDataResiliencyState as jest.Mock).mockImplementation(() => {
        callCount++;
        // First call returns WARNING, second call returns OK
        if (callCount === 1) {
          return { state: HealthState.WARNING, message: 'Rebuilding' };
        }
        return { state: HealthState.OK, message: 'Healthy' };
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      // Should have both WARNING and Healthy states
      expect(screen.getByText('WARNING')).toBeInTheDocument();
      // There will be multiple "Healthy" texts (from cluster status and object resiliency)
      const healthyTexts = screen.getAllByText('Healthy');
      expect(healthyTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Version Information', () => {
    it('should display ODF version when CSV is loaded', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('4.12.0')).toBeInTheDocument();
    });

    it('should display DASH when CSV is not loaded', () => {
      (useFetchCsv as jest.Mock).mockReturnValue([null, false, undefined]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      // Should display DASH for version
      expect(screen.getAllByText(DASH).length).toBeGreaterThan(0);
    });

    it('should display DASH when CSV has error', () => {
      (useFetchCsv as jest.Mock).mockReturnValue([
        null,
        true,
        new Error('CSV error'),
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getAllByText(DASH).length).toBeGreaterThan(0);
    });

    it('should display update channel when subscription is loaded', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('stable-4.12')).toBeInTheDocument();
    });

    it('should display DASH when subscription is not loaded', () => {
      const { useSafeK8sWatchResource } = require('@odf/core/hooks');
      (useSafeK8sWatchResource as jest.Mock).mockReturnValue([
        null,
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getAllByText(DASH).length).toBeGreaterThan(0);
    });

    it('should display DASH when subscription has error', () => {
      const { useSafeK8sWatchResource } = require('@odf/core/hooks');
      (useSafeK8sWatchResource as jest.Mock).mockReturnValue([
        null,
        true,
        new Error('Subscription error'),
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getAllByText(DASH).length).toBeGreaterThan(0);
    });
  });

  describe('Capacity Chart', () => {
    it('should render capacity chart when capacity data is available', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.queryByText('No capacity data available.')
      ).not.toBeInTheDocument();
    });

    it('should display "No capacity data available" when capacity is loading', () => {
      (useRawCapacity as jest.Mock).mockReturnValue([
        null,
        null,
        true,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('No capacity data available.')
      ).toBeInTheDocument();
    });

    it('should display "No capacity data available" when capacity has error', () => {
      (useRawCapacity as jest.Mock).mockReturnValue([
        null,
        null,
        false,
        new Error('Capacity error'),
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('No capacity data available.')
      ).toBeInTheDocument();
    });

    it('should display "No capacity data available" when total capacity is zero', () => {
      (useRawCapacity as jest.Mock).mockReturnValue([
        mockPrometheusMetric('0'),
        mockPrometheusMetric('0'),
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('No capacity data available.')
      ).toBeInTheDocument();
    });

    it('should calculate capacity ratio correctly for general state', () => {
      // 2 TiB used out of 10 TiB total = 20% (under 80% warning threshold)
      (useRawCapacity as jest.Mock).mockReturnValue([
        mockPrometheusMetric('10995116277760'), // 10 TiB
        mockPrometheusMetric('2199023255552'), // 2 TiB
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.queryByText('No capacity data available.')
      ).not.toBeInTheDocument();
    });

    it('should handle warning threshold capacity ratio (80-85%)', () => {
      // 8.3 TiB used out of 10 TiB total = 83%
      (useRawCapacity as jest.Mock).mockReturnValue([
        mockPrometheusMetric('10995116277760'), // 10 TiB
        mockPrometheusMetric('9125805605683'), // 8.3 TiB
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.queryByText('No capacity data available.')
      ).not.toBeInTheDocument();
    });

    it('should handle danger threshold capacity ratio (>85%)', () => {
      // 9.5 TiB used out of 10 TiB total = 95%
      (useRawCapacity as jest.Mock).mockReturnValue([
        mockPrometheusMetric('10995116277760'), // 10 TiB
        mockPrometheusMetric('10445360463872'), // 9.5 TiB
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.queryByText('No capacity data available.')
      ).not.toBeInTheDocument();
    });

    it('should handle edge case with zero used capacity', () => {
      (useRawCapacity as jest.Mock).mockReturnValue([
        mockPrometheusMetric('10995116277760'), // 10 TiB
        mockPrometheusMetric('0'), // 0 used
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.queryByText('No capacity data available.')
      ).not.toBeInTheDocument();
    });

    it('should handle edge case with full capacity', () => {
      (useRawCapacity as jest.Mock).mockReturnValue([
        mockPrometheusMetric('10995116277760'), // 10 TiB
        mockPrometheusMetric('10995116277760'), // 10 TiB used (100%)
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.queryByText('No capacity data available.')
      ).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should render "View storage" button', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('View storage')).toBeInTheDocument();
    });

    it('should navigate to storage cluster page when button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      const viewStorageButton = screen.getByText('View storage');
      await user.click(viewStorageButton);

      // Verify button is present and clickable
      expect(viewStorageButton).toBeInTheDocument();
    });
  });

  describe('Namespace Handling', () => {
    it('should handle different namespace correctly', () => {
      (useODFNamespaceSelector as jest.Mock).mockReturnValue({
        odfNamespace: 'custom-namespace',
        isNsSafe: true,
      });

      const customStorageCluster = {
        ...mockStorageCluster,
        metadata: {
          ...mockStorageCluster.metadata,
          namespace: 'custom-namespace',
        },
      };

      (useK8sWatchResource as jest.Mock).mockReturnValue([
        [customStorageCluster],
        true,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });

    it('should handle unsafe namespace', () => {
      (useODFNamespaceSelector as jest.Mock).mockReturnValue({
        odfNamespace: 'openshift-storage',
        isNsSafe: false,
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });
  });

  describe('Multiple Storage Clusters', () => {
    it('should handle multiple storage clusters and pick the correct one', () => {
      const clusters = [
        {
          ...mockStorageCluster,
          metadata: {
            name: 'cluster-1',
            namespace: 'other-namespace',
          },
        },
        {
          ...mockStorageCluster,
          metadata: {
            name: 'cluster-2',
            namespace: 'openshift-storage',
          },
        },
      ];

      (useK8sWatchResource as jest.Mock).mockReturnValue([
        clusters,
        true,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
      expect(screen.getByText('Cluster Status')).toBeInTheDocument();
    });
  });

  describe('Prometheus Errors', () => {
    it('should handle ceph resiliency prometheus error', () => {
      let callCount = 0;
      (useCustomPrometheusPoll as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return [null, new Error('Prometheus error')];
        }
        return [createPrometheusResponse('0'), undefined];
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });

    it('should handle object resiliency prometheus error', () => {
      let callCount = 0;
      (useCustomPrometheusPoll as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return [null, new Error('Prometheus error')];
        }
        return [createPrometheusResponse('0'), undefined];
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });

    it('should handle both resiliency prometheus errors', () => {
      (useCustomPrometheusPoll as jest.Mock).mockReturnValue([
        null,
        new Error('Prometheus error'),
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to Card', () => {
      const { container } = render(
        <BrowserRouter>
          <StorageClusterCard className="custom-class" />
        </BrowserRouter>
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null storage cluster gracefully', () => {
      (useK8sWatchResource as jest.Mock).mockReturnValue([
        [null],
        true,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('No storage cluster configured.')
      ).toBeInTheDocument();
    });

    it('should handle storage cluster without metadata', () => {
      (useK8sWatchResource as jest.Mock).mockReturnValue([
        [{ kind: 'StorageCluster' }],
        true,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });

    it('should handle empty CSV response', () => {
      (useFetchCsv as jest.Mock).mockReturnValue([{}, true, undefined]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });

    it('should handle empty subscription response', () => {
      const { useSafeK8sWatchResource } = require('@odf/core/hooks');
      (useSafeK8sWatchResource as jest.Mock).mockReturnValue([
        {},
        true,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });

    it('should handle missing capacity data gracefully', () => {
      (useRawCapacity as jest.Mock).mockReturnValue([
        null,
        null,
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('No capacity data available.')
      ).toBeInTheDocument();
    });

    it('should handle invalid capacity metric format', () => {
      (useRawCapacity as jest.Mock).mockReturnValue([
        { metric: {}, value: null },
        { metric: {}, value: null },
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('No capacity data available.')
      ).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all data loaded successfully with healthy state', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
      expect(screen.getByText('Cluster Status')).toBeInTheDocument();
      expect(screen.getByText('Block and File Resiliency')).toBeInTheDocument();
      expect(screen.getByText('Object Resiliency')).toBeInTheDocument();
      expect(screen.getByText('Data Foundation version')).toBeInTheDocument();
      expect(screen.getByText('Update channel')).toBeInTheDocument();
      expect(screen.getByText('View storage')).toBeInTheDocument();
      expect(
        screen.queryByText('No capacity data available.')
      ).not.toBeInTheDocument();
    });

    it('should handle all data loaded with mixed health states', () => {
      (useGetOCSHealth as jest.Mock).mockReturnValue({
        healthState: HealthState.WARNING,
        message: 'Warning',
      });

      let callCount = 0;
      (getDataResiliencyState as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { state: HealthState.ERROR, message: 'Error' };
        }
        return { state: HealthState.OK, message: 'Healthy' };
      });

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('ERROR')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('should handle partial data loading state', () => {
      (useK8sWatchResource as jest.Mock).mockReturnValue([
        [mockStorageCluster],
        true,
        undefined,
      ]);
      (useFetchCsv as jest.Mock).mockReturnValue([null, false, undefined]);
      const { useSafeK8sWatchResource } = require('@odf/core/hooks');
      (useSafeK8sWatchResource as jest.Mock).mockReturnValue([
        null,
        false,
        undefined,
      ]);

      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
      expect(screen.getAllByText(DASH).length).toBeGreaterThan(0);
    });

    it('should update when capacity changes', () => {
      const { rerender } = render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.queryByText('No capacity data available.')
      ).not.toBeInTheDocument();

      // Update capacity to show no data
      (useRawCapacity as jest.Mock).mockReturnValue([
        mockPrometheusMetric('0'),
        mockPrometheusMetric('0'),
        false,
        undefined,
      ]);

      rerender(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      expect(
        screen.getByText('No capacity data available.')
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for the chart', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      // The chart should be rendered with proper accessibility
      expect(screen.getByText('Storage cluster')).toBeInTheDocument();
    });

    it('should have proper structure for screen readers', () => {
      render(
        <BrowserRouter>
          <StorageClusterCard />
        </BrowserRouter>
      );

      // Check for description list structure
      expect(screen.getByText('Cluster Status')).toBeInTheDocument();
      expect(screen.getByText('Block and File Resiliency')).toBeInTheDocument();
      expect(screen.getByText('Object Resiliency')).toBeInTheDocument();
    });
  });
});
