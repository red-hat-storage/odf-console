import { NodeData } from '@odf/core/types';
import { renderHook } from '@testing-library/react';
import { useNodeBulkSelect } from './useNodeBulkSelect';

const makeNode = (name: string): NodeData =>
  ({
    apiVersion: 'v1',
    kind: 'Node',
    metadata: { name, uid: name },
    spec: {},
  }) as NodeData;

const a = makeNode('a');
const b = makeNode('b');
const c = makeNode('c');

const names = (list: NodeData[]) => list.map((n) => n.metadata.name).sort();

describe('useNodeBulkSelect', () => {
  it('reports all-selected when every visible selectable node is selected', () => {
    const { result } = renderHook(() =>
      useNodeBulkSelect({
        selectableNodes: [a, b],
        selectedNodes: [a, b],
        onChange: jest.fn(),
      })
    );
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isAllSelected).toBe(true);
    expect(result.current.isPartiallySelected).toBe(false);
  });

  it('reports partially-selected when some but not all are selected', () => {
    const { result } = renderHook(() =>
      useNodeBulkSelect({
        selectableNodes: [a, b],
        selectedNodes: [a],
        onChange: jest.fn(),
      })
    );
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isPartiallySelected).toBe(true);
  });

  it('reports nothing selected for an empty selection', () => {
    const { result } = renderHook(() =>
      useNodeBulkSelect({
        selectableNodes: [a, b],
        selectedNodes: [],
        onChange: jest.fn(),
      })
    );
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
    expect(result.current.isPartiallySelected).toBe(false);
  });

  it('is never all-selected when there are no selectable nodes', () => {
    const { result } = renderHook(() =>
      useNodeBulkSelect({
        selectableNodes: [],
        selectedNodes: [],
        onChange: jest.fn(),
      })
    );
    expect(result.current.isAllSelected).toBe(false);
  });

  it('selectAll selects every visible node and preserves hidden selections', () => {
    const onChange = jest.fn();
    // `c` is selected but not visible (hidden by a search).
    const { result } = renderHook(() =>
      useNodeBulkSelect({
        selectableNodes: [a, b],
        selectedNodes: [c],
        onChange,
      })
    );
    result.current.onSelectAll();
    expect(names(onChange.mock.calls[0][0])).toEqual(['a', 'b', 'c']);
  });

  it('selectNone clears visible selections but preserves hidden ones', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useNodeBulkSelect({
        selectableNodes: [a, b],
        selectedNodes: [a, c],
        onChange,
      })
    );
    result.current.onSelectNone();
    // `a` (visible) is cleared; `c` (hidden by search) is kept.
    expect(names(onChange.mock.calls[0][0])).toEqual(['c']);
  });
});
