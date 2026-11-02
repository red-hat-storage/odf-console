import { NodeData } from '@odf/core/types';
import { act, renderHook } from '@testing-library/react';
import { useNodeSelection } from './useNodeSelection';

const makeNode = (
  name: string,
  overrides: Partial<NodeData['metadata']> = {}
): NodeData =>
  ({
    apiVersion: 'v1',
    kind: 'Node',
    metadata: { name, uid: name, ...overrides },
    spec: { taints: [] },
  }) as NodeData;

const a = makeNode('alpha');
const b = makeNode('beta');
const c = makeNode('gamma');

const names = (list: NodeData[]) => list.map((n) => n.metadata.name).sort();

describe('useNodeSelection', () => {
  it('exposes the full node list before any search', () => {
    const { result } = renderHook(() =>
      useNodeSelection({
        nodes: [a, b, c],
        selectedNodes: [],
        onChange: jest.fn(),
      })
    );
    expect(names(result.current.filteredNodes)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
    expect(result.current.query).toBe('');
  });

  it('filters the visible nodes by the free-text query', () => {
    const { result } = renderHook(() =>
      useNodeSelection({
        nodes: [a, b, c],
        selectedNodes: [],
        onChange: jest.fn(),
      })
    );
    act(() => result.current.setQuery('alph'));
    expect(names(result.current.filteredNodes)).toEqual(['alpha']);
  });

  it('row selection preserves selections hidden by the active search', () => {
    const onChange = jest.fn();
    // `gamma` is selected but filtered out of view; selecting `beta` must keep it.
    const { result } = renderHook(() =>
      useNodeSelection({
        nodes: [a, b, c],
        selectedNodes: [c],
        onChange,
      })
    );
    act(() => result.current.setQuery('a')); // matches alpha, beta, gamma -> narrow it
    act(() => result.current.setQuery('eta')); // only beta visible now
    result.current.handleRowSelection([b]);
    expect(names(onChange.mock.calls.at(-1)[0])).toEqual(['beta', 'gamma']);
  });

  it('bulk select operates on the visible set and preserves hidden selections', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useNodeSelection({
        nodes: [a, b, c],
        selectedNodes: [c],
        onChange,
      })
    );
    act(() => result.current.setQuery('a')); // alpha, beta, gamma all contain "a"
    result.current.bulkSelect.onSelectAll();
    expect(names(onChange.mock.calls.at(-1)[0])).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('excludes nodes being deleted from the selectable (bulk) set by default', () => {
    const onChange = jest.fn();
    const deleting = makeNode('delta', {
      deletionTimestamp: '2026-01-01T00:00:00Z',
    });
    const { result } = renderHook(() =>
      useNodeSelection({
        nodes: [a, deleting],
        selectedNodes: [],
        onChange,
      })
    );
    result.current.bulkSelect.onSelectAll();
    // `delta` is being deleted, so "select all" must not pull it in.
    expect(names(onChange.mock.calls.at(-1)[0])).toEqual(['alpha']);
  });

  it('honors a custom isNodeSelectable for the selectable (bulk) set', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useNodeSelection({
        nodes: [a, b, c],
        selectedNodes: [],
        onChange,
        isNodeSelectable: (node) => node.metadata.name !== 'beta',
      })
    );
    result.current.bulkSelect.onSelectAll();
    expect(names(onChange.mock.calls.at(-1)[0])).toEqual(['alpha', 'gamma']);
  });
});
