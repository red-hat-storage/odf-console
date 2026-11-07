import * as React from 'react';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { Taint } from '@odf/shared/types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { SortByDirection } from '@patternfly/react-table';
import {
  SelectLocalClusterNodesTable,
  matchesNodeQuery,
  taintsSort,
} from './select-local-cluster-nodes-table';

// `fuzzysearch` is a CommonJS single-function module. Under jest's swc transform
// the `import * as fuzzy` wildcard interop in @odf/shared/utils wraps it into a
// non-callable namespace object. Marking it `__esModule` makes the interop
// return the function as-is so `fuzzyCaseInsensitive` works in tests.
jest.mock('fuzzysearch', () => {
  const fuzzy = jest.requireActual('fuzzysearch');
  return Object.assign(fuzzy, { __esModule: true });
});

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

describe('taintsSort', () => {
  const twoTaints = makeNode('a', [
    { key: 'k1', effect: 'NoSchedule' },
    { key: 'k2', effect: 'NoSchedule' },
  ]);
  const oneTaint = makeNode('b', [{ key: 'k1', effect: 'NoSchedule' }]);
  const noTaints = makeNode('c');

  it('ascending orders untainted nodes first', () => {
    const sorted = [twoTaints, oneTaint, noTaints]
      .sort((x, y) => taintsSort(x, y, SortByDirection.asc))
      .map((n) => n.metadata.name);
    expect(sorted).toEqual(['c', 'b', 'a']);
  });

  it('descending orders most-tainted nodes first', () => {
    const sorted = [noTaints, oneTaint, twoTaints]
      .sort((x, y) => taintsSort(x, y, SortByDirection.desc))
      .map((n) => n.metadata.name);
    expect(sorted).toEqual(['a', 'b', 'c']);
  });

  it('breaks ties on equal taint count by node name', () => {
    const zed = makeNode('zed', [{ key: 'k', effect: 'NoSchedule' }]);
    const abe = makeNode('abe', [{ key: 'k', effect: 'NoSchedule' }]);
    const sorted = [zed, abe]
      .sort((x, y) => taintsSort(x, y, SortByDirection.asc))
      .map((n) => n.metadata.name);
    expect(sorted).toEqual(['abe', 'zed']);
  });
});

describe('matchesNodeQuery', () => {
  it('matches every node when the query is empty', () => {
    expect(matchesNodeQuery(makeNode('any-node'), '')).toBe(true);
  });

  it('matches by node name, case-insensitively and fuzzily', () => {
    const node = makeNode('Worker-01');
    expect(matchesNodeQuery(node, 'worker')).toBe(true);
    expect(matchesNodeQuery(node, 'wrk01')).toBe(true); // subsequence match
    expect(matchesNodeQuery(node, 'zzz')).toBe(false);
  });

  it('matches by label key or value', () => {
    const node = makeNode('n', [], {
      'topology.kubernetes.io/zone': 'us-east-1',
    });
    expect(matchesNodeQuery(node, 'zone')).toBe(true);
    expect(matchesNodeQuery(node, 'east')).toBe(true);
    expect(matchesNodeQuery(node, 'nomatch')).toBe(false);
  });

  it('matches by taint key or value', () => {
    const node = makeNode('n', [
      { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
    ]);
    expect(matchesNodeQuery(node, 'dedicated')).toBe(true);
    expect(matchesNodeQuery(node, 'storage')).toBe(true);
  });

  it('does not match an untainted, unlabeled node on unrelated text', () => {
    expect(matchesNodeQuery(makeNode('plain-node', [], {}), 'qqqqq')).toBe(
      false
    );
  });

  it('keeps an untainted node whose label matches the same query as a taint', () => {
    // A query meant for a taint should still surface untainted nodes whose
    // name/label contain the needle (the unified-filter guarantee).
    const taintedNode = makeNode('tainted', [
      { key: 'xyz123', effect: 'NoSchedule' },
    ]);
    const untaintedNode = makeNode('n', [], { purpose: 'xyzservice' });
    expect(matchesNodeQuery(taintedNode, 'xyz')).toBe(true);
    expect(matchesNodeQuery(untaintedNode, 'xyz')).toBe(true);
  });
});

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
      within(taintedRow).getByRole('button', { name: '1 taints' })
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

  it('sorts by taint count when the Taints column header is clicked', async () => {
    renderTable();

    // Default order is name-sorted: tainted ('a-') before untainted ('z-').
    expect(rowNameOrder()).toEqual(['a', 'z']);

    const taintsHeader = screen.getByRole('columnheader', { name: 'Taints' });
    await userEvent.click(within(taintsHeader).getByRole('button'));

    // Ascending taint-count sort groups untainted (0 taints) first.
    expect(rowNameOrder()).toEqual(['z', 'a']);
  });
});
