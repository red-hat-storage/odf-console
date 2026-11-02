import { NodeData } from '@odf/core/types';
import { Taint } from '@odf/shared/types';
import { SortByDirection } from '@patternfly/react-table';
import {
  matchesNodeQuery,
  mergePreservedSelection,
  nameSort,
  taintsSort,
} from './node-filter';

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

describe('nameSort', () => {
  it('ascending orders nodes by name', () => {
    const sorted = [makeNode('c'), makeNode('a'), makeNode('b')]
      .sort((x, y) => nameSort(x, y, SortByDirection.asc))
      .map((n) => n.metadata.name);
    expect(sorted).toEqual(['a', 'b', 'c']);
  });

  it('descending reverses the name order', () => {
    const sorted = [makeNode('a'), makeNode('c'), makeNode('b')]
      .sort((x, y) => nameSort(x, y, SortByDirection.desc))
      .map((n) => n.metadata.name);
    expect(sorted).toEqual(['c', 'b', 'a']);
  });
});

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

  it('matches by node name, case-insensitively on any substring', () => {
    const node = makeNode('Worker-01');
    expect(matchesNodeQuery(node, 'worker')).toBe(true);
    expect(matchesNodeQuery(node, 'rker-0')).toBe(true); // partial substring
    expect(matchesNodeQuery(node, 'ER-01')).toBe(true); // case-insensitive
    expect(matchesNodeQuery(node, 'wrk01')).toBe(false); // not a substring
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

describe('mergePreservedSelection', () => {
  const a = makeNode('a');
  const b = makeNode('b');
  const c = makeNode('c');

  it('keeps selections of nodes filtered out of the visible set', () => {
    // `a` is currently selected but hidden by the search; `b` is a newly
    // selected visible node. Both survive the merge.
    const merged = mergePreservedSelection([a], [b], [b, c]);
    expect(merged.map((n) => n.metadata.name).sort()).toEqual(['a', 'b']);
  });

  it('drops a visible node that was deselected', () => {
    // `b` was selected but is now absent from `visibleSelected`, so it is
    // dropped; hidden `a` is preserved.
    const merged = mergePreservedSelection([a, b], [], [b, c]);
    expect(merged.map((n) => n.metadata.name)).toEqual(['a']);
  });

  it('fully replaces the selection when nothing is hidden', () => {
    const merged = mergePreservedSelection([a], [b, c], [a, b, c]);
    expect(merged.map((n) => n.metadata.name).sort()).toEqual(['b', 'c']);
  });
});
