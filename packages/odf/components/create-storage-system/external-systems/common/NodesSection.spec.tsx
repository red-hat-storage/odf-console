import React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { useNodesData } from '@odf/core/hooks';
import { render, waitFor } from '@testing-library/react';
import { NodesSection } from './NodesSection';

jest.mock('@odf/core/hooks', () => ({
  useNodesData: jest.fn(),
}));

jest.mock('@odf/core/components/utils', () => ({
  createWizardNodeState: jest.fn((nodes) => nodes),
}));

jest.mock('../../select-nodes-table/select-nodes-table', () => ({
  SelectNodesTable: () => null,
}));

describe('NodesSection', () => {
  const allNodes = [{ name: 'node1' }, { name: 'node2' }];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNodesData).mockReturnValue([allNodes as any, true, null]);
  });

  it('preserves disabled SAN initialization behavior', async () => {
    const setSelectedNodes = jest.fn();

    render(
      <NodesSection
        isDisabled
        selectedNodes={[]}
        setSelectedNodes={setSelectedNodes}
      />
    );

    await waitFor(() =>
      expect(setSelectedNodes).toHaveBeenCalledWith(allNodes)
    );
    expect(createWizardNodeState).toHaveBeenCalledWith(allNodes);
  });
});
