import * as React from 'react';
import { useNodesData } from '@odf/core/hooks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardNodeState } from '../../reducer';
import { SANNodesSection, ScaleNodesSection } from './NodesSection';

jest.mock('@odf/core/hooks', () => ({
  useNodesData: jest.fn(),
}));

jest.mock('@odf/core/components/utils', () => ({
  createWizardNodeState: jest.fn((nodes) =>
    nodes.map((node) => ({ ...node, name: node.metadata.name }))
  ),
}));

jest.mock(
  './select-local-cluster-nodes-table/select-local-cluster-nodes-table',
  () => ({
    SelectLocalClusterNodesTable: () => (
      <div data-test-id="local-cluster-nodes-table" />
    ),
  })
);

jest.mock('../../../nodes-table/NodesTable', () => ({
  NodesTable: ({ nodes, selectedNodes, loaded, isRowSelectable }) => (
    <div
      data-test-id="nodes-table"
      data-nodes={nodes.map((node) => node.metadata.name).join(',')}
      data-selected={selectedNodes.map((node) => node.metadata.name).join(',')}
      data-disabled={nodes
        .filter((node) => isRowSelectable && !isRowSelectable(node))
        .map((node) => node.metadata.name)
        .join(',')}
      data-loaded={loaded}
    />
  ),
}));

const ineligible = {
  areSelectedNodesEligible: false,
  isLoading: false,
  error: '',
  nodesWithoutKernelDevel: [],
};

describe('NodesSection', () => {
  it('renders the local cluster table when all-nodes selection is hidden', () => {
    (useNodesData as jest.Mock).mockReturnValue([[], true, null]);

    render(<SANNodesSection selectedNodes={[]} setSelectedNodes={jest.fn()} />);

    expect(screen.getByTestId('local-cluster-nodes-table')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Include control plane nodes' })
    ).not.toBeInTheDocument();
  });

  it('selects all worker nodes once they load', async () => {
    const nodes = [
      {
        metadata: {
          name: 'node-0',
          uid: 'node-0-uid',
          labels: { 'node-role.kubernetes.io/worker': '' },
        },
        spec: {},
      },
      {
        metadata: {
          name: 'node-1',
          uid: 'node-1-uid',
          labels: { 'node-role.kubernetes.io/worker': '' },
        },
        spec: {},
      },
    ];
    const setSelectedNodes = jest.fn();

    (useNodesData as jest.Mock).mockReturnValue([nodes, true, null]);

    render(
      <ScaleNodesSection
        selectedNodes={[]}
        setSelectedNodes={setSelectedNodes}
        kernelDevelEligibility={ineligible}
      />
    );

    await waitFor(() =>
      expect(setSelectedNodes).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'node-0' }),
        expect.objectContaining({ name: 'node-1' }),
      ])
    );
  });

  it('shows fixed nodes as selected and disabled', () => {
    const nodes = [
      {
        metadata: {
          name: 'selectable-node',
          labels: { 'node-role.kubernetes.io/worker': '' },
        },
        spec: {},
      },
      {
        metadata: {
          name: 'fixed-node',
          labels: { 'node-role.kubernetes.io/worker': '' },
        },
        spec: {},
      },
    ];
    (useNodesData as jest.Mock).mockReturnValue([nodes, true, null]);

    render(
      <ScaleNodesSection
        selectedNodes={[]}
        setSelectedNodes={jest.fn()}
        isNodeFixed={(node) => node.metadata.name === 'fixed-node'}
        kernelDevelEligibility={ineligible}
      />
    );

    expect(screen.getByTestId('nodes-table')).toHaveAttribute(
      'data-selected',
      'fixed-node'
    );
    expect(screen.getByTestId('nodes-table')).toHaveAttribute(
      'data-disabled',
      'fixed-node'
    );
  });

  it('shows worker nodes by default and reveals unselected control plane nodes on request', async () => {
    const nodes = [
      {
        metadata: {
          name: 'worker-0',
          uid: 'worker-0-uid',
          labels: { 'node-role.kubernetes.io/worker': '' },
        },
        spec: {},
      },
      {
        metadata: {
          name: 'control-plane-0',
          uid: 'control-plane-0-uid',
          labels: { 'node-role.kubernetes.io/control-plane': '' },
        },
        spec: {
          taints: [
            {
              key: 'node-role.kubernetes.io/master',
              effect: 'NoSchedule',
            },
          ],
        },
      },
    ];
    const onSelectionChange = jest.fn();

    (useNodesData as jest.Mock).mockReturnValue([nodes, true, null]);

    const TestScaleNodesSection = () => {
      const [selectedNodes, setSelectedNodes] = React.useState<
        WizardNodeState[]
      >([]);
      const handleSelection = (nextNodes: WizardNodeState[]) => {
        setSelectedNodes(nextNodes);
        onSelectionChange(nextNodes);
      };

      return (
        <ScaleNodesSection
          selectedNodes={selectedNodes}
          setSelectedNodes={handleSelection}
          kernelDevelEligibility={ineligible}
        />
      );
    };

    render(<TestScaleNodesSection />);

    await waitFor(() =>
      expect(screen.getByTestId('nodes-table')).toHaveAttribute(
        'data-selected',
        'worker-0'
      )
    );
    expect(screen.getByTestId('nodes-table')).toHaveAttribute(
      'data-nodes',
      'worker-0'
    );

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Include control plane nodes' })
    );

    expect(screen.getByTestId('nodes-table')).toHaveAttribute(
      'data-nodes',
      'worker-0,control-plane-0'
    );
    expect(screen.getByTestId('nodes-table')).toHaveAttribute(
      'data-selected',
      'worker-0'
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: 'worker-0' }),
    ]);
  });

  it.each([
    {
      eligibility: { ...ineligible, isLoading: true },
      message: 'Checking kernel-devel packages on selected nodes',
    },
    {
      eligibility: { ...ineligible, error: 'watch failed' },
      message: 'Unable to verify kernel-devel package status watch failed',
    },
    {
      eligibility: {
        ...ineligible,
        nodesWithoutKernelDevel: ['node-0'],
      },
      message:
        'Kernel-devel packages are missing on some selected nodes. Please apply the Machine Config Operator (MCO) update to install them before continuing.',
    },
  ])('renders kernel-devel status: $message', ({ eligibility, message }) => {
    (useNodesData as jest.Mock).mockReturnValue([[], true, null]);

    render(
      <ScaleNodesSection
        selectedNodes={[{ name: 'node-0' }]}
        setSelectedNodes={jest.fn()}
        kernelDevelEligibility={eligibility}
      />
    );

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders verified kernel-devel status', () => {
    (useNodesData as jest.Mock).mockReturnValue([[], true, null]);

    render(
      <ScaleNodesSection
        selectedNodes={[{ name: 'node-0' }]}
        setSelectedNodes={jest.fn()}
        kernelDevelEligibility={{
          ...ineligible,
          areSelectedNodesEligible: true,
        }}
      />
    );

    expect(
      screen.getByText('Kernel-devel packages verified')
    ).toBeInTheDocument();
  });

  it('passes the node loading state to the table', () => {
    (useNodesData as jest.Mock).mockReturnValue([[], false, null]);

    render(
      <ScaleNodesSection
        selectedNodes={[]}
        setSelectedNodes={jest.fn()}
        kernelDevelEligibility={ineligible}
      />
    );

    expect(screen.getByTestId('nodes-table')).toHaveAttribute(
      'data-loaded',
      'false'
    );
  });
});
