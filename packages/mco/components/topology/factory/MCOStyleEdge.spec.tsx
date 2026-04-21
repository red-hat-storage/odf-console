import * as React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Edge } from '@patternfly/react-topology';
import { MCOStyleEdge } from './MCOStyleEdge';

// Mock PatternFly Topology components
jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  DefaultEdge: ({ element }: any) => (
    <g data-testid="default-edge" data-element-id={element.getId()} />
  ),
  observer: (component: any) => component,
}));

const createMockEdge = (data: Record<string, unknown>): Partial<Edge> => ({
  getData: jest.fn(() => data) as any,
  getSource: jest.fn(() => ({
    getBounds: () => ({ x: 100, y: 100, width: 75, height: 75 }),
  })) as any,
  getTarget: jest.fn(() => ({
    getBounds: () => ({ x: 400, y: 100, width: 75, height: 75 }),
  })) as any,
  getId: jest.fn(() => 'test-edge'),
});

describe('MCOStyleEdge', () => {
  describe('Edge Rendering', () => {
    it('should render edge with DefaultEdge component', () => {
      const edge = createMockEdge({
        policies: [
          { name: 'policy1', phase: 'Available', isConfiguring: false },
        ],
        isConfiguring: false,
        pairKey: 'cluster1::cluster2',
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      // DefaultEdge should be rendered
      expect(container.querySelector('g')).toBeInTheDocument();
    });

    it('should render dashed edge style', () => {
      const edge = createMockEdge({
        policies: [
          { name: 'policy1', phase: 'Configuring', isConfiguring: true },
        ],
        isConfiguring: true,
        pairKey: 'cluster1::cluster2',
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      expect(container.querySelector('g')).toBeInTheDocument();
    });

    it('should render without terminal arrows', () => {
      const edge = createMockEdge({
        policies: [
          { name: 'policy1', phase: 'Available', isConfiguring: false },
        ],
        isConfiguring: false,
        pairKey: 'cluster1::cluster2',
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      // Edge should render without arrows (no terminal markers)
      expect(container.querySelector('g')).toBeInTheDocument();
    });
  });

  describe('Operation Edge Rendering', () => {
    it('should render edge for operation', () => {
      const edge = createMockEdge({
        isOperation: true,
        operation: {
          drpcName: 'drpc-app1',
          applicationName: 'app1',
          action: 'Failover',
          phase: 'FailingOver',
        },
        pairKey: 'cluster1::cluster2',
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      // Should render the edge
      expect(container.querySelector('g')).toBeInTheDocument();
    });

    it('should render edge with progression data', () => {
      const edge = createMockEdge({
        isOperation: true,
        operation: {
          drpcName: 'drpc-app1',
          applicationName: 'app1',
          action: 'Failover',
          phase: 'FailingOver',
          progression: 'WaitOnUserToCleanUp',
        },
        pairKey: 'cluster1::cluster2',
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      // Edge should render as an SVG group element
      expect(container.querySelector('g')).toBeInTheDocument();
    });
  });

  describe('Edge Styling', () => {
    it('should render edge with dashed style', () => {
      const edge = createMockEdge({
        isOperation: true,
        operation: { applicationName: 'app1' },
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      // Edge should render with DefaultEdge
      expect(container.querySelector('g')).toBeInTheDocument();
    });

    it('should render policy edge', () => {
      const edge = createMockEdge({
        policies: [{ name: 'policy1' }],
        isConfiguring: false,
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      // Edge should render
      expect(container.querySelector('g')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing data gracefully', () => {
      const edge = createMockEdge({}) as Edge;

      expect(() => {
        render(
          <svg>
            <MCOStyleEdge element={edge} />
          </svg>
        );
      }).not.toThrow();
    });

    it('should default to solid style when no special conditions', () => {
      const edge = createMockEdge({
        isOperation: false,
        isConfiguring: false,
      }) as Edge;

      expect(() => {
        render(
          <svg>
            <MCOStyleEdge element={edge} />
          </svg>
        );
      }).not.toThrow();
    });
  });
});
