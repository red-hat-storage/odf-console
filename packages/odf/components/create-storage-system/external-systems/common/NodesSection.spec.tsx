import * as React from 'react';
import { useNodesData } from '@odf/core/hooks';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardNodeState } from '../../reducer';
import { NodesSection } from './NodesSection';

jest.mock('@odf/core/hooks', () => ({
  useNodesData: jest.fn(),
}));

jest.mock('@odf/core/components/utils', () => ({
  createWizardNodeState: jest.fn((nodes) =>
    nodes.map((node) => ({ ...node, name: node.metadata.name }))
  ),
}));

jest.mock('../../select-nodes-table/select-nodes-table', () => ({
  SelectNodesTable: () => null,
  NodesTable: ({ nodesData, selectedNodes }) => (
    <div
      data-test-id="nodes-table"
      data-nodes={nodesData.map((node) => node.metadata.name).join(',')}
      data-selected={selectedNodes.map((node) => node.metadata.name).join(',')}
    />
  ),
}));

describe('NodesSection', () => {
  it('selects all nodes once they load when all nodes is the default', async () => {
    const nodes = [
      { metadata: { name: 'node-0', uid: 'node-0-uid' } },
      { metadata: { name: 'node-1', uid: 'node-1-uid' } },
    ];
    const setSelectedNodes = jest.fn();

    (useNodesData as jest.Mock).mockReturnValue([nodes, true, null]);

    render(
      <NodesSection selectedNodes={[]} setSelectedNodes={setSelectedNodes} />
    );

    await waitFor(() =>
      expect(setSelectedNodes).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'node-0' }),
        expect.objectContaining({ name: 'node-1' }),
      ])
    );
  });

  it('shows worker nodes by default and adds control plane nodes on request', async () => {
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
        spec: {},
      },
    ];
    const onSelectionChange = jest.fn();

    (useNodesData as jest.Mock).mockReturnValue([nodes, true, null]);

    const TestNodesSection = () => {
      const [selectedNodes, setSelectedNodes] = React.useState<
        WizardNodeState[]
      >([]);
      const handleSelection = (nextNodes: WizardNodeState[]) => {
        setSelectedNodes(nextNodes);
        onSelectionChange(nextNodes);
      };

      return (
        <NodesSection
          showNodesTable
          selectedNodes={selectedNodes}
          setSelectedNodes={handleSelection}
        />
      );
    };

    render(<TestNodesSection />);

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
      'worker-0,control-plane-0'
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: 'worker-0' }),
      expect.objectContaining({ name: 'control-plane-0' }),
    ]);
  });
});
