import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { useNodesData } from '@odf/core/hooks';
import { useListPageFilter } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom-v5-compat';
import { createFakeNodesData } from '../../../../../jest/helpers';
import { SelectNodesTable } from './select-nodes-table';

jest.mock('@odf/core/hooks', () => ({
  ...jest.requireActual('@odf/core/hooks'),
  useNodesData: jest.fn(),
}));
// Mock needed due to sdk @console/internal declarations.
jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  ListPageFilter: jest.fn(() => <></>),
  useListPageFilter: jest.fn(),
}));
const onRowSelected = jest.fn();

const systemNamespace = 'openshift-storage';
const cpu = 12;
const memory = 32 * 1000 * 1000 * 1000;
const nodes = createFakeNodesData(3, cpu, memory);
const selectedNodes = createWizardNodeState(nodes);
(useNodesData as jest.Mock).mockReturnValue([nodes, true, null]);
(useListPageFilter as jest.Mock).mockReturnValue([nodes, nodes, jest.fn()]);

describe('Select Nodes Table', () => {
  it('shows the table including the Select All checkbox', () => {
    render(
      <BrowserRouter>
        <SelectNodesTable
          nodes={selectedNodes}
          onRowSelected={onRowSelected}
          systemNamespace={systemNamespace}
        />
      </BrowserRouter>
    );

    const selectAll = screen.getByRole('checkbox', {
      name: /select all rows/i,
    });
    expect(selectAll).toBeVisible();

    const footer = screen.getByTestId('nodes-selected');
    expect(footer).toBeVisible();
  });

  it('shows the table without the Select All checkbox', () => {
    render(
      <BrowserRouter>
        <SelectNodesTable
          nodes={selectedNodes}
          onRowSelected={onRowSelected}
          disableLabeledNodes={true}
          systemNamespace={systemNamespace}
        />
      </BrowserRouter>
    );

    const selectAll = screen.queryByRole('checkbox', {
      name: /select all rows/i,
    });
    expect(selectAll).not.toBeInTheDocument();
  });
});
