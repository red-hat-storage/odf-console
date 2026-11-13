import * as React from 'react';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { Taint } from '@odf/shared/types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { SelectLocalClusterNodesTable } from './select-local-cluster-nodes-table';

// Override the globally-mocked (non-interpolating) translation hook so that
// interpolated strings like "{{count}} taints" render with real values.
jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key.replace(/{{(\w+)}}/g, (_match, name) =>
        String(options?.[name] ?? '')
      ),
  }),
}));

jest.mock('@odf/core/hooks', () => ({
  ...jest.requireActual('@odf/core/hooks'),
  useNodesData: jest.fn(),
}));

const makeNode = (
  name: string,
  taints: Taint[] = [],
  labels: Record<string, string> = { 'node-role.kubernetes.io/worker': '' }
): NodeData =>
  ({
    apiVersion: 'v1',
    kind: 'Node',
    metadata: { name, uid: name, labels },
    spec: { taints },
    status: { capacity: { cpu: '8', memory: '32Gi' } },
  }) as NodeData;

describe('SelectLocalClusterNodesTable', () => {
  // Sorted name-first: the tainted node ('a-tainted') renders before the
  // untainted one ('z-untainted') by default, so a taint-count sort visibly
  // reorders them.
  const taintedWorker = makeNode('a-tainted', [
    { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
  ]);
  const untaintedWorker = makeNode('z-untainted');

  const renderTable = (props = {}) =>
    render(
      <MemoryRouter>
        <SelectLocalClusterNodesTable
          nodes={[]}
          onRowSelected={jest.fn()}
          onLocalClusterRoleChange={jest.fn()}
          {...props}
        />
      </MemoryRouter>
    );

  const rowNameOrder = () =>
    screen
      .getAllByRole('row')
      .slice(1) // drop the header row
      .map((row) => (row.textContent?.includes('a-tainted') ? 'a' : 'z'));

  beforeEach(() => {
    (useNodesData as jest.Mock).mockReturnValue([
      [taintedWorker, untaintedWorker],
      true,
      null,
    ]);
  });

  it('shows tainted workers unchecked and untainted workers checked by default', () => {
    const onRowSelected = jest.fn();
    renderTable({ onRowSelected });

    const taintedRow = screen.getByText('a-tainted').closest('tr');
    const untaintedRow = screen.getByText('z-untainted').closest('tr');

    // Both nodes are shown (tainted node is no longer filtered out)...
    expect(taintedRow).toBeInTheDocument();
    expect(untaintedRow).toBeInTheDocument();
    // ...but only the untainted node is pre-selected.
    expect(within(taintedRow).getByRole('checkbox')).not.toBeChecked();
    expect(within(untaintedRow).getByRole('checkbox')).toBeChecked();

    // The tainted node exposes its taint via the Taints cell link.
    expect(
      within(taintedRow).getByRole('button', { name: /taint/i })
    ).toBeInTheDocument();
    expect(
      within(untaintedRow).queryByRole('button', { name: /taints/ })
    ).not.toBeInTheDocument();

    // The default selection reported upward contains only the untainted node.
    const lastSelection = onRowSelected.mock.calls.at(-1)?.[0] as NodeData[];
    expect(lastSelection.map((n) => n.metadata.name)).toEqual(['z-untainted']);
  });

  it('filters rows by the search box across name, label, and taint', async () => {
    renderTable();

    expect(screen.getByText('a-tainted')).toBeInTheDocument();
    expect(screen.getByText('z-untainted')).toBeInTheDocument();

    const search = screen.getByPlaceholderText('Find by name, label, or taint');
    await userEvent.type(search, 'z-untainted');

    expect(screen.queryByText('a-tainted')).not.toBeInTheDocument();
    expect(screen.getByText('z-untainted')).toBeInTheDocument();

    await userEvent.clear(search);
    expect(screen.getByText('a-tainted')).toBeInTheDocument();
  });

  it('adds to the existing selection when a node is selected while searching', async () => {
    const onRowSelected = jest.fn();
    // Two untainted workers (selected by default) + one tainted worker.
    (useNodesData as jest.Mock).mockReturnValue([
      [
        makeNode('compute-0'),
        makeNode('compute-1'),
        makeNode('compute-2', [
          { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
        ]),
      ],
      true,
      null,
    ]);
    renderTable({ onRowSelected });

    // Default selection is the two untainted nodes.
    expect(
      (onRowSelected.mock.calls.at(-1)?.[0] as NodeData[]).map(
        (n) => n.metadata.name
      )
    ).toEqual(['compute-0', 'compute-1']);

    // Search narrows the view to the (currently unselected) tainted node only.
    const search = screen.getByPlaceholderText('Find by name, label, or taint');
    await userEvent.type(search, 'pute-2');
    expect(screen.queryByText('compute-0')).not.toBeInTheDocument();
    expect(screen.queryByText('compute-1')).not.toBeInTheDocument();

    // Selecting it must ADD to the out-of-view selection, not replace it.
    const taintedRow = screen.getByText('compute-2').closest('tr');
    await userEvent.click(within(taintedRow).getByRole('checkbox'));

    const lastSelection = onRowSelected.mock.calls.at(-1)?.[0] as NodeData[];
    expect(lastSelection.map((n) => n.metadata.name).sort()).toEqual([
      'compute-0',
      'compute-1',
      'compute-2',
    ]);
  });

  it('bulk-selects and clears every node via the toolbar control', async () => {
    const onRowSelected = jest.fn();
    renderTable({ onRowSelected });

    // Default selection is the untainted node only; the toolbar reflects that.
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    // "Select all" picks up the tainted worker too.
    await userEvent.click(
      screen.getByRole('button', { name: 'Bulk selection' })
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Select all' }));
    expect(
      (onRowSelected.mock.calls.at(-1)?.[0] as NodeData[])
        .map((n) => n.metadata.name)
        .sort()
    ).toEqual(['a-tainted', 'z-untainted']);
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    // "Select none" clears everything.
    await userEvent.click(
      screen.getByRole('button', { name: 'Bulk selection' })
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Select none' })
    );
    expect(onRowSelected.mock.calls.at(-1)?.[0]).toEqual([]);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('preserves nodes hidden by the search when using bulk select none', async () => {
    const onRowSelected = jest.fn();
    renderTable({ onRowSelected });

    // Start from all selected.
    await userEvent.click(
      screen.getByRole('button', { name: 'Bulk selection' })
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Select all' }));

    // Narrow the view to just the untainted node.
    const search = screen.getByPlaceholderText('Find by name, label, or taint');
    await userEvent.type(search, 'z-untainted');

    // "Select none" clears only the visible node; the hidden tainted one stays.
    await userEvent.click(
      screen.getByRole('button', { name: 'Bulk selection' })
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Select none' })
    );
    expect(
      (onRowSelected.mock.calls.at(-1)?.[0] as NodeData[]).map(
        (n) => n.metadata.name
      )
    ).toEqual(['a-tainted']);
  });

  it('sorts by taint count when the Taints column header is clicked', async () => {
    renderTable();

    // Default order is name-sorted: tainted ('a-') before untainted ('z-').
    expect(rowNameOrder()).toEqual(['a', 'z']);

    const taintsHeader = screen.getByRole('columnheader', { name: 'Taints' });
    await userEvent.click(within(taintsHeader).getByRole('button'));

    // Ascending taint-count sort groups untainted (0 taints) first.
    expect(rowNameOrder()).toEqual(['z', 'a']);
  });

  describe('Include control plane nodes toggle', () => {
    const controlPlaneLabels = {
      'node-role.kubernetes.io/control-plane': '',
    };
    const worker0 = makeNode('worker-0');
    const worker1 = makeNode('worker-1');
    const cp0 = makeNode('cp-0', [], controlPlaneLabels);
    const cp1 = makeNode('cp-1', [], controlPlaneLabels);

    const lastSelectionNames = (onRowSelected: jest.Mock) =>
      (onRowSelected.mock.calls.at(-1)?.[0] as NodeData[])
        .map((n) => n.metadata.name)
        .sort();

    beforeEach(() => {
      // Worker-only set when unchecked; worker + control-plane set when checked.
      (useNodesData as jest.Mock).mockImplementation(
        (_onlyWorker: boolean, includeControlPlane: boolean) =>
          includeControlPlane
            ? [[worker0, worker1, cp0, cp1], true, null]
            : [[worker0, worker1], true, null]
      );
    });

    const element = (
      includeControlPlane: boolean,
      onRowSelected: jest.Mock
    ) => (
      <MemoryRouter>
        <SelectLocalClusterNodesTable
          nodes={[]}
          onRowSelected={onRowSelected}
          onLocalClusterRoleChange={jest.fn()}
          includeControlPlane={includeControlPlane}
        />
      </MemoryRouter>
    );

    it('auto-selects control plane nodes on check and restores the prior worker selection on uncheck', async () => {
      const onRowSelected = jest.fn();
      const { rerender } = render(element(false, onRowSelected));

      // Default: both untainted workers selected.
      expect(lastSelectionNames(onRowSelected)).toEqual([
        'worker-0',
        'worker-1',
      ]);

      // User customizes the worker selection by deselecting worker-0.
      const worker0Row = screen.getByText('worker-0').closest('tr');
      await userEvent.click(within(worker0Row).getByRole('checkbox'));
      expect(lastSelectionNames(onRowSelected)).toEqual(['worker-1']);

      // Check "Include control plane nodes": the control-plane nodes are added
      // AND the edited worker selection (worker-1 only) is preserved.
      rerender(element(true, onRowSelected));
      expect(lastSelectionNames(onRowSelected)).toEqual([
        'cp-0',
        'cp-1',
        'worker-1',
      ]);
      // The control-plane rows render pre-selected.
      const cp0Row = screen.getByText('cp-0').closest('tr');
      expect(within(cp0Row).getByRole('checkbox')).toBeChecked();

      // Uncheck: control-plane nodes are dropped and we return to the prior
      // worker selection (worker-1), NOT the untainted-worker default.
      rerender(element(false, onRowSelected));
      expect(lastSelectionNames(onRowSelected)).toEqual(['worker-1']);
      expect(screen.queryByText('cp-0')).not.toBeInTheDocument();
    });
  });
});
