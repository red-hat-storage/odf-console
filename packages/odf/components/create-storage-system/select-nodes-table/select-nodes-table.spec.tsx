import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { NodeKind } from '@odf/shared/types';
import {
  useK8sWatchResource,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { SelectNodesTable } from './select-nodes-table';

jest.mock(
  '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api',
  () => ({
    ...jest.requireActual(
      '@openshift-console/dynamic-plugin-sdk/lib/api/dynamic-core-api'
    ),
    useK8sWatchResource: jest.fn(),
    useListPageFilter: jest.fn(),
  })
);
jest.mock('@odf/core/redux/selectors/odf-namespace', () => ({
  useODFNamespaceSelector: jest.fn(() => ['openshift-storage', true, null]),
}));
const onRowSelected = jest.fn();

const createFakeNodes = (
  amount: number,
  cpu: number,
  memory: string
): NodeKind[] =>
  Array.from(
    Array(amount),
    (): NodeKind => ({
      status: { capacity: { cpu: cpu }, allocatable: { memory: memory } },
      metadata: {},
    })
  );
const cpu = 12;
const memory = String(32 * 1000 * 1000 * 1000);
const nodes: NodeKind[] = createFakeNodes(3, cpu, memory);
const selectedNodes = createWizardNodeState(nodes);
(useK8sWatchResource as jest.Mock).mockReturnValue([nodes, true, null]);
(useListPageFilter as jest.Mock).mockReturnValue([nodes, nodes, jest.fn()]);

const history = createMemoryHistory();
// eslint-disable-next-line no-console
const originalError = console.error.bind(console.error);
let consoleSpy: jest.SpyInstance;

describe('Select Nodes Table', () => {
  beforeAll(() => {
    // Ignore error messages coming from ListPageBody (third-party dependency).
    consoleSpy = jest.spyOn(console, 'error').mockImplementation((...data) => {
      if (!data.toString().includes('ListPageBody.js')) {
        originalError(...data);
      }
    });
  });

  afterAll(() => consoleSpy.mockRestore());

  it('shows the table including the Select All checkbox', () => {
    render(
      <Router history={history}>
        <SelectNodesTable nodes={selectedNodes} onRowSelected={onRowSelected} />
      </Router>
    );

    const selectAll = screen.getByRole('checkbox', {
      name: /select all rows/i,
    });
    expect(selectAll).toBeVisible();
  });

  it('shows the table without the Select All checkbox', () => {
    render(
      <Router history={history}>
        <SelectNodesTable
          nodes={selectedNodes}
          onRowSelected={onRowSelected}
          disableLabeledNodes={true}
        />
      </Router>
    );

    const selectAll = screen.queryByRole('checkbox', {
      name: /select all rows/i,
    });
    expect(selectAll).not.toBeInTheDocument();
  });
});
