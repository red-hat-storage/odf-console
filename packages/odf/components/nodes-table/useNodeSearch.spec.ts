import { NodeData } from '@odf/core/types';
import { Taint } from '@odf/shared/types';
import { act, renderHook } from '@testing-library/react';
import { useNodeSearch } from './useNodeSearch';

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

const nodes = [
  makeNode('compute-0'),
  makeNode('compute-1', [
    { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
  ]),
  makeNode('control-2', [], { 'topology.kubernetes.io/zone': 'us-east-1' }),
];

const names = (list: NodeData[]) => list.map((n) => n.metadata.name);

describe('useNodeSearch', () => {
  it('returns every node and an empty query initially', () => {
    const { result } = renderHook(() => useNodeSearch(nodes));
    expect(result.current.query).toBe('');
    expect(names(result.current.filteredNodes)).toEqual([
      'compute-0',
      'compute-1',
      'control-2',
    ]);
  });

  it('filters by name as the query changes', () => {
    const { result } = renderHook(() => useNodeSearch(nodes));

    act(() => result.current.setQuery('compute'));
    expect(result.current.query).toBe('compute');
    expect(names(result.current.filteredNodes)).toEqual([
      'compute-0',
      'compute-1',
    ]);
  });

  it('filters by taint and by label through the unified matcher', () => {
    const { result } = renderHook(() => useNodeSearch(nodes));

    act(() => result.current.setQuery('storage'));
    expect(names(result.current.filteredNodes)).toEqual(['compute-1']);

    act(() => result.current.setQuery('us-east'));
    expect(names(result.current.filteredNodes)).toEqual(['control-2']);
  });

  it('restores the full list when the query is cleared', () => {
    const { result } = renderHook(() => useNodeSearch(nodes));

    act(() => result.current.setQuery('compute-0'));
    expect(names(result.current.filteredNodes)).toEqual(['compute-0']);

    act(() => result.current.setQuery(''));
    expect(names(result.current.filteredNodes)).toEqual([
      'compute-0',
      'compute-1',
      'control-2',
    ]);
  });
});
