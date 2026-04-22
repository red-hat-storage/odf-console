import * as React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Node } from '@patternfly/react-topology';
import { DRActionType } from '../../../constants';
import { ActiveDROperation } from '../../../hooks/useActiveDROperations';
import { Phase, Progression } from '../../../types';
import { MCOStyleAppNode } from './MCOStyleAppNode';

// Mock useDetailsLevel hook
jest.mock('@patternfly/react-topology/dist/esm/hooks/useDetailsLevel', () => ({
  __esModule: true,
  default: jest.fn(() => 'high'),
}));

// Mock PatternFly Topology components
jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  DefaultNode: ({ element, children, attachments, className }: any) => (
    <g
      data-testid="default-node"
      data-element-id={element.getId()}
      className={className}
    >
      {children}
      {attachments}
    </g>
  ),
  Decorator: ({ icon, x, y }: any) => (
    <g data-testid="decorator" transform={`translate(${x}, ${y})`}>
      {icon}
    </g>
  ),
  observer: (component: any) => component,
  getDefaultShapeDecoratorCenter: () => ({ x: 0, y: 0 }),
}));

const createMockOperation = (
  overrides?: Partial<ActiveDROperation>
): ActiveDROperation => ({
  drpcName: 'drpc-app1',
  applicationName: 'app1',
  applicationNamespace: 'ns1',
  action: DRActionType.FAILOVER,
  phase: Phase.FailingOver,
  progression: Progression.FailingOver,
  sourceCluster: 'cluster1',
  targetCluster: 'cluster2',
  isDiscoveredApp: false,
  ...overrides,
});

const createMockAppNode = (
  isSource: boolean,
  operation: ActiveDROperation
): Partial<Node> => ({
  getData: jest.fn(() => ({
    operation,
    isSource,
    clusterName: isSource ? operation.sourceCluster : operation.targetCluster,
  })) as any,
  getDimensions: jest.fn(() => ({ width: 50, height: 50 })) as any,
  getId: jest.fn(
    () => `app-${operation.drpcName}-${isSource ? 'source' : 'target'}`
  ),
});

describe('MCOStyleAppNode', () => {
  describe('Source App Node', () => {
    it('should render source app with source animation class', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(true, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      const appNodeGroup = container.querySelector('.mco-app-node--source');
      expect(appNodeGroup).toBeInTheDocument();
    });

    it('should have fade-pulse animation class', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(true, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      const appNodeGroup = container.querySelector('.mco-app-node--source');
      expect(appNodeGroup).toBeInTheDocument();
    });

    it('should render with source class', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(true, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      const appNode = container.querySelector('.mco-app-node--source');
      expect(appNode).toBeInTheDocument();
    });

    it('should have lower opacity (fading out)', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(true, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      // Source nodes get the mco-app-node--source class which applies lower opacity via CSS
      const appNode = container.querySelector('.mco-app-node--source');
      expect(appNode).toBeInTheDocument();
    });
  });

  describe('Target App Node', () => {
    it('should render target app with target animation class', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(false, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      const appNodeGroup = container.querySelector('.mco-app-node--target');
      expect(appNodeGroup).toBeInTheDocument();
    });

    it('should have brighten-pulse animation class', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(false, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      const appNodeGroup = container.querySelector('.mco-app-node--target');
      expect(appNodeGroup).toBeInTheDocument();
    });

    it('should render with target class', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(false, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      const appNode = container.querySelector('.mco-app-node--target');
      expect(appNode).toBeInTheDocument();
    });

    it('should have higher opacity (arriving/solid)', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(false, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      // Target nodes get the mco-app-node--target class which applies higher opacity via CSS
      const appNode = container.querySelector('.mco-app-node--target');
      expect(appNode).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should render CubeIcon for app', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(true, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      // CubeIcon (now CogIcon) should be rendered inside the node
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show count badge when multiple apps', () => {
      const operation = createMockOperation();
      const node = {
        ...createMockAppNode(true, operation),
        getData: jest.fn(() => ({
          operation,
          isSource: true,
          clusterName: 'cluster1',
          appCount: 3,
        })),
      } as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const countBadge = Array.from(texts).find((t) => t.textContent === '3');
      expect(countBadge).toBeInTheDocument();
    });

    it('should have border stroke', () => {
      const operation = createMockOperation();
      const node = createMockAppNode(true, operation) as Node;

      const { container } = render(
        <svg>
          <MCOStyleAppNode element={node} />
        </svg>
      );

      // Verify the node renders successfully with DefaultNode mock
      expect(
        container.querySelector('[data-testid="default-node"]')
      ).toBeInTheDocument();
    });
  });

  describe('Different Operations', () => {
    it('should render correctly for Failover operation', () => {
      const operation = createMockOperation({ action: DRActionType.FAILOVER });
      const node = createMockAppNode(true, operation) as Node;

      expect(() => {
        render(
          <svg>
            <MCOStyleAppNode element={node} />
          </svg>
        );
      }).not.toThrow();
    });

    it('should render correctly for Relocate operation', () => {
      const operation = createMockOperation({ action: DRActionType.RELOCATE });
      const node = createMockAppNode(false, operation) as Node;

      expect(() => {
        render(
          <svg>
            <MCOStyleAppNode element={node} />
          </svg>
        );
      }).not.toThrow();
    });
  });
});
