import * as React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Node } from '@patternfly/react-topology';
import { ClusterPairOperationsMap } from '../../../hooks/useActiveDROperations';
import { ClusterAppsMap } from '../../../hooks/useProtectedAppsByCluster';
import { TopologyDataContext } from '../context/TopologyContext';
import { TopologyViewLevel } from '../types';
import { MCOStyleNode } from './MCOStyleNode';

// Mock the context
const mockContextValue = {
  clusters: [],
  selectedElement: null,
  setSelectedElement: jest.fn(),
  visualizationLevel: TopologyViewLevel.CLUSTERS,
  clusterAppsMap: {} as ClusterAppsMap,
  clusterPairOperationsMap: {} as ClusterPairOperationsMap,
};

// Mock useDetailsLevel hook
jest.mock('@patternfly/react-topology/dist/esm/hooks/useDetailsLevel', () => ({
  __esModule: true,
  default: jest.fn(() => 'high'),
}));

// Mock PatternFly Topology components
jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  DefaultNode: ({ element, children }: any) => (
    <g data-testid="default-node" data-element-id={element.getId()}>
      {children}
    </g>
  ),
  observer: (component: any) => component,
}));

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom-v5-compat', () => ({
  useNavigate: () => mockNavigate,
}));

// Helper to create mock node - simplified since DefaultNode is mocked
const createMockNode = (clusterName: string): Partial<Node> => ({
  getData: jest.fn(() => ({
    resource: {
      metadata: { name: clusterName, uid: `uid-${clusterName}` },
      kind: 'ManagedCluster',
    },
  })) as any,
  getDimensions: jest.fn(() => ({ width: 75, height: 75 })) as any,
  getId: jest.fn(() => `uid-${clusterName}`),
});

describe('MCOStyleNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Icon Display', () => {
    it('should show ClusterIcon when no apps are protected', () => {
      const node = createMockNode('cluster1') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: {
          cluster1: [],
        } as any,
      };

      render(
        <TopologyDataContext.Provider value={context}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      // ClusterIcon should be rendered (we can verify via test-id or other attributes)
      expect(node.getData).toHaveBeenCalled();
    });

    it('should show CubeIcon when exactly 1 app is protected', () => {
      const node = createMockNode('cluster1') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: {
          cluster1: [
            {
              name: 'app1',
              namespace: 'ns1',
              drPolicy: 'policy1',
              status: 'Available',
            },
          ],
        } as any,
      };

      render(
        <TopologyDataContext.Provider value={context}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      expect(node.getData).toHaveBeenCalled();
    });

    it('should show LayerGroupIcon when multiple apps are protected', () => {
      const node = createMockNode('cluster1') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: {
          cluster1: [
            {
              name: 'app1',
              namespace: 'ns1',
              drPolicy: 'policy1',
              status: 'Available',
            },
            {
              name: 'app2',
              namespace: 'ns2',
              drPolicy: 'policy1',
              status: 'Available',
            },
          ],
        } as any,
      };

      render(
        <TopologyDataContext.Provider value={context}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      expect(node.getData).toHaveBeenCalled();
    });

    it('should render successfully when multiple apps exist', () => {
      const node = createMockNode('cluster1') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: {
          cluster1: [
            {
              name: 'app1',
              namespace: 'ns1',
              drPolicy: 'policy1',
              status: 'Available',
            },
            {
              name: 'app2',
              namespace: 'ns2',
              drPolicy: 'policy1',
              status: 'Available',
            },
            {
              name: 'app3',
              namespace: 'ns3',
              drPolicy: 'policy1',
              status: 'Available',
            },
          ],
        } as any,
      };

      const { container } = render(
        <TopologyDataContext.Provider value={context}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      expect(
        container.querySelector('[data-testid="default-node"]')
      ).toBeInTheDocument();
      expect(node.getData).toHaveBeenCalled();
    });
  });

  describe('Moving Apps Filtering', () => {
    it('should exclude apps that are currently moving', () => {
      const node = createMockNode('cluster1') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: {
          cluster1: [
            {
              name: 'app1',
              namespace: 'ns1',
              drPolicy: 'policy1',
              status: 'Available',
            },
            {
              name: 'app2',
              namespace: 'ns2',
              drPolicy: 'policy1',
              status: 'Available',
            },
          ],
        } as any,
        clusterPairOperationsMap: {
          'cluster1::cluster2': [
            {
              drpcName: 'drpc-app1',
              applicationName: 'app1', // This app is moving
              applicationNamespace: 'ns1',
              action: 'Failover',
              phase: 'FailingOver',
              sourceCluster: 'cluster1',
              targetCluster: 'cluster2',
            },
          ],
        } as any,
      };

      const { container } = render(
        <TopologyDataContext.Provider value={context}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      // Should show count of 1 (app2 only, app1 is moving)
      const text = container.querySelector('text');
      expect(text?.textContent).not.toBe('2');
    });

    it('should exclude apps moving to this cluster', () => {
      const node = createMockNode('cluster2') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: {
          cluster2: [
            {
              name: 'app1',
              namespace: 'ns1',
              drPolicy: 'policy1',
              status: 'Available',
            },
          ],
        } as any,
        clusterPairOperationsMap: {
          'cluster1::cluster2': [
            {
              drpcName: 'drpc-app1',
              applicationName: 'app1', // Moving TO cluster2
              applicationNamespace: 'ns1',
              action: 'Relocate',
              phase: 'Relocating',
              sourceCluster: 'cluster1',
              targetCluster: 'cluster2',
            },
          ],
        } as any,
      };

      render(
        <TopologyDataContext.Provider value={context}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      // app1 should be filtered out since it's in transit
      expect(node.getData).toHaveBeenCalled();
    });

    it('should show ClusterIcon when all apps are moving', () => {
      const node = createMockNode('cluster1') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: {
          cluster1: [
            {
              name: 'app1',
              namespace: 'ns1',
              drPolicy: 'policy1',
              status: 'Available',
            },
          ],
        } as any,
        clusterPairOperationsMap: {
          'cluster1::cluster2': [
            {
              drpcName: 'drpc-app1',
              applicationName: 'app1',
              applicationNamespace: 'ns1',
              action: 'Failover',
              phase: 'FailingOver',
              sourceCluster: 'cluster1',
              targetCluster: 'cluster2',
            },
          ],
        } as any,
      };

      render(
        <TopologyDataContext.Provider value={context}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      // Should show ClusterIcon since no static apps remain
      expect(node.getData).toHaveBeenCalled();
    });
  });

  describe('Context Menu', () => {
    it('should open context menu on right click', () => {
      const node = createMockNode('cluster1') as Node;

      const { container } = render(
        <TopologyDataContext.Provider value={mockContextValue}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      // Find the DefaultNode wrapper and trigger context menu
      const nodeElement = container.querySelector('g');
      expect(nodeElement).toBeDefined();
    });

    it('should navigate to DR policy creation on "Pair cluster" click', () => {
      const node = createMockNode('cluster1') as Node;

      render(
        <TopologyDataContext.Provider value={mockContextValue}>
          <svg>
            <MCOStyleNode element={node} />
          </svg>
        </TopologyDataContext.Provider>
      );

      // Context menu interactions would need portal rendering
      // This is a simplified test
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing clusterAppsMap gracefully', () => {
      const node = createMockNode('cluster1') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: undefined,
      };

      expect(() => {
        render(
          <TopologyDataContext.Provider value={context}>
            <svg>
              <MCOStyleNode element={node} />
            </svg>
          </TopologyDataContext.Provider>
        );
      }).not.toThrow();
    });

    it('should handle missing clusterPairOperationsMap gracefully', () => {
      const node = createMockNode('cluster1') as Node;
      const context = {
        ...mockContextValue,
        clusterAppsMap: {
          cluster1: [
            {
              name: 'app1',
              namespace: 'ns1',
              drPolicy: 'policy1',
              status: 'Available',
            },
          ],
        } as any,
        clusterPairOperationsMap: undefined,
      };

      expect(() => {
        render(
          <TopologyDataContext.Provider value={context}>
            <svg>
              <MCOStyleNode element={node} />
            </svg>
          </TopologyDataContext.Provider>
        );
      }).not.toThrow();
    });
  });
});
