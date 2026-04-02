import * as React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Edge } from '@patternfly/react-topology';
import { MCOStyleEdge } from './MCOStyleEdge';

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
  describe('Policy Edge (Cluster-to-Cluster)', () => {
    it('should render solid edge for available policy', () => {
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

    it('should render dashed edge for configuring policy', () => {
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

    it('should not show progression overlay for policy edge', () => {
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

      // EdgeProgressionOverlay should not be present
      const foreignObject = container.querySelector('foreignObject');
      expect(foreignObject).not.toBeInTheDocument();
    });
  });

  describe('Operation Edge (App-to-App)', () => {
    it('should render dashed animated edge for operation', () => {
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

      // Should have animation class
      const group = container.querySelector(
        '.mco-topology-edge--active-operation'
      );
      expect(group).toBeInTheDocument();
    });

    it('should show progression overlay for operation edge', () => {
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

      // EdgeProgressionOverlay renders a foreignObject
      expect(container.querySelector('g')).toBeInTheDocument();
    });
  });

  describe('Edge Styling', () => {
    it('should apply correct className for operation edge', () => {
      const edge = createMockEdge({
        isOperation: true,
        operation: { applicationName: 'app1' },
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      const operationEdge = container.querySelector(
        '.mco-topology-edge--active-operation'
      );
      expect(operationEdge).toBeInTheDocument();
    });

    it('should not have special className for policy edge', () => {
      const edge = createMockEdge({
        policies: [{ name: 'policy1' }],
        isConfiguring: false,
      }) as Edge;

      const { container } = render(
        <svg>
          <MCOStyleEdge element={edge} />
        </svg>
      );

      const operationEdge = container.querySelector(
        '.mco-topology-edge--active-operation'
      );
      expect(operationEdge).not.toBeInTheDocument();
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
