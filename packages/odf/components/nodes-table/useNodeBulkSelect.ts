import * as React from 'react';
import { NodeData } from '@odf/core/types';
import { getUID } from '@odf/shared/selectors';
import { mergePreservedSelection } from './node-filter';

type UseNodeBulkSelectArgs = {
  // Currently-visible selectable rows ("all" refers to this set).
  selectableNodes: NodeData[];
  // The full current selection, including rows hidden by an active search.
  selectedNodes: NodeData[];
  onChange: (nextSelected: NodeData[]) => void;
};

// Derives the state and actions a bulk-select control needs from the visible
// selectable rows and the current selection. Bulk actions operate on the
// visible set and preserve selections hidden by an active search (via
// `mergePreservedSelection`), matching the table's own header select-all
// checkbox, which is likewise scoped to the visible selectable rows.
export const useNodeBulkSelect = ({
  selectableNodes,
  selectedNodes,
  onChange,
}: UseNodeBulkSelectArgs) => {
  const selectedCount = selectedNodes.length;

  const isAllSelected = React.useMemo(() => {
    if (!selectableNodes.length) {
      return false;
    }
    const selectedIds = new Set(selectedNodes.map(getUID));
    return selectableNodes.every((node) => selectedIds.has(getUID(node)));
  }, [selectableNodes, selectedNodes]);

  const isPartiallySelected = selectedCount > 0 && !isAllSelected;

  const onSelectAll = React.useCallback(() => {
    onChange(
      mergePreservedSelection(selectedNodes, selectableNodes, selectableNodes)
    );
  }, [onChange, selectableNodes, selectedNodes]);

  const onSelectNone = React.useCallback(() => {
    onChange(mergePreservedSelection(selectedNodes, [], selectableNodes));
  }, [onChange, selectableNodes, selectedNodes]);

  return {
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    onSelectAll,
    onSelectNone,
  };
};
