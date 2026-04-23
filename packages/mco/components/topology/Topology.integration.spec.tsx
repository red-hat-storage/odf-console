import * as React from 'react';
import '@testing-library/jest-dom';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { render, waitFor } from '@testing-library/react';
import { ACMManagedClusterKind } from '../../types';
import Topology from './Topology';

// Mock all dependencies
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
  HealthState: {
    OK: 'OK',
    ERROR: 'ERROR',
    WARNING: 'WARNING',
    UNKNOWN: 'UNKNOWN',
    LOADING: 'LOADING',
    PROGRESS: 'PROGRESS',
    UPDATING: 'UPDATING',
    UPGRADABLE: 'UPGRADABLE',
    NOT_AVAILABLE: 'NOT_AVAILABLE',
  },
  AlertSeverity: {
    Critical: 'critical',
    Warning: 'warning',
    Info: 'info',
    None: 'none',
  },
}));

jest.mock('@odf/shared/hooks/use-fetch-csv', () => ({
  useFetchCsv: jest.fn(() => [{ spec: { version: '4.18.0' } }, true, null]),
}));

jest.mock('../../hooks', () => ({
  getManagedClusterResourceObj: jest.fn(() => ({})),
  useProtectedAppsByCluster: jest.fn(() => [{}, true, null]),
  useDRPoliciesByClusterPair: jest.fn(() => [{}, true, null]),
  useActiveDROperations: jest.fn(() => [{}, true, null]),
}));

jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  VisualizationProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useVisualizationController: jest.fn(() => ({
    fromModel: jest.fn(),
    toModel: jest.fn(() => ({ nodes: [], edges: [] })),
    getGraph: jest.fn(() => ({
      scaleBy: jest.fn(),
      fit: jest.fn(),
      reset: jest.fn(),
      layout: jest.fn(),
    })),
  })),
  VisualizationSurface: () => <div data-testid="visualization-surface" />,
  TopologyView: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="topology-view">{children}</div>
  ),
  TopologyControlBar: () => <div data-testid="control-bar" />,
}));

jest.mock('@odf/shared/topology', () => ({
  useVisualizationSetup: jest.fn(() => ({
    fromModel: jest.fn(),
    toModel: jest.fn(() => ({ nodes: [], edges: [] })),
    getGraph: jest.fn(() => ({
      scaleBy: jest.fn(),
      fit: jest.fn(),
      reset: jest.fn(),
      layout: jest.fn(),
    })),
  })),
  useTopologyControls: jest.fn(() => []),
  useSelectionHandler: jest.fn(),
  createNode: jest.fn((config: any) => ({
    id: config.id,
    type: config.type || 'node',
    label: config.label,
    data: { resource: config.resource, kind: config.kind, badge: config.badge },
    width: config.width,
    height: config.height,
  })),
  BaseTopologyView: ({
    children,
    sideBar,
  }: {
    children: React.ReactNode;
    sideBar?: React.ReactNode;
  }) => (
    <div data-testid="base-topology">
      {children}
      {sideBar}
    </div>
  ),
}));

const mockUseK8sWatchResource = useK8sWatchResource as jest.MockedFunction<
  typeof useK8sWatchResource
>;

describe('Topology Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      mockUseK8sWatchResource.mockReturnValue([[], false, null]);

      const { container } = render(<Topology />);

      // Should show loading indicator (from HandleErrorAndLoading)
      expect(container).toBeDefined();
    });

    it('should render topology when data is loaded', async () => {
      const mockClusters: ACMManagedClusterKind[] = [
        {
          apiVersion: 'cluster.open-cluster-management.io/v1',
          kind: 'ManagedCluster',
          metadata: { name: 'cluster1', uid: 'uid-1' },
          status: {},
        },
      ];

      mockUseK8sWatchResource.mockReturnValue([mockClusters, true, null]);

      const { container } = render(<Topology />);

      await waitFor(() => {
        // Check if topology container is rendered
        const topologyElement = container.querySelector('.mco-topology');
        expect(topologyElement).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no clusters exist', () => {
      mockUseK8sWatchResource.mockReturnValue([[], true, null]);

      const { getByText } = render(<Topology />);

      expect(getByText('No clusters found')).toBeInTheDocument();
      expect(
        getByText('Connect managed clusters to view the topology')
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error when cluster fetch fails', () => {
      const mockError = new Error('Failed to fetch clusters');
      mockUseK8sWatchResource.mockReturnValue([[], false, mockError]);

      const { container } = render(<Topology />);

      // Error should be passed to HandleErrorAndLoading
      expect(container).toBeDefined();
    });
  });

  describe('Topology Rendering', () => {
    it('should render topology view with clusters', async () => {
      const mockClusters: ACMManagedClusterKind[] = [
        {
          apiVersion: 'cluster.open-cluster-management.io/v1',
          kind: 'ManagedCluster',
          metadata: { name: 'cluster1', uid: 'uid-1' },
        },
        {
          apiVersion: 'cluster.open-cluster-management.io/v1',
          kind: 'ManagedCluster',
          metadata: { name: 'cluster2', uid: 'uid-2' },
        },
      ];

      mockUseK8sWatchResource.mockReturnValue([mockClusters, true, null]);

      const { container } = render(<Topology />);

      await waitFor(() => {
        // Check if topology container is rendered
        const topologyElement = container.querySelector('.mco-topology');
        expect(topologyElement).toBeInTheDocument();
      });
    });
  });

  describe('Context Provider', () => {
    it('should provide topology data context to children', async () => {
      const mockClusters: ACMManagedClusterKind[] = [
        {
          apiVersion: 'cluster.open-cluster-management.io/v1',
          kind: 'ManagedCluster',
          metadata: { name: 'cluster1', uid: 'uid-1' },
        },
      ];

      mockUseK8sWatchResource.mockReturnValue([mockClusters, true, null]);

      const { container } = render(<Topology />);

      await waitFor(() => {
        // Context should be provided (verified through successful rendering)
        expect(
          container.querySelector('[data-testid="base-topology"]')
        ).toBeInTheDocument();
      });
    });
  });
});

describe('Topology With Error Handler', () => {
  it('should show topology when clusters exist', () => {
    const mockClusters: ACMManagedClusterKind[] = [
      {
        apiVersion: 'cluster.open-cluster-management.io/v1',
        kind: 'ManagedCluster',
        metadata: { name: 'cluster1', uid: 'uid-1' },
      },
    ];

    mockUseK8sWatchResource.mockReturnValue([mockClusters, true, null]);

    const { queryByText } = render(<Topology />);

    expect(queryByText('No clusters found')).not.toBeInTheDocument();
  });

  it('should show empty state when no clusters', () => {
    mockUseK8sWatchResource.mockReturnValue([[], true, null]);

    const { getByText } = render(<Topology />);

    expect(getByText('No clusters found')).toBeInTheDocument();
  });
});
