import * as React from 'react';
import { NodeData } from '@odf/core/types';
import { mergePreservedSelection } from './node-filter';
import { useNodeBulkSelect } from './useNodeBulkSelect';
import { useNodeSearch } from './useNodeSearch';

type UseNodeSelectionArgs = {
  // Full node list backing the table (pre-search).
  nodes: NodeData[];
  // The full current selection, including rows hidden by an active search.
  selectedNodes: NodeData[];
  // Called with the next full selection whenever it changes.
  onChange: (nextSelected: NodeData[]) => void;
  // Optional per-row selectability. Defaults to "not being deleted", matching
  // <SelectableTable>'s own fallback so bulk "select all" never pulls in a
  // row that renders disabled.
  isNodeSelectable?: (node: NodeData) => boolean;
};

const isNotBeingDeleted = (node: NodeData): boolean =>
  !node.metadata?.deletionTimestamp;

// One cohesive hook for the node-selection tables (Fusion Access SAN and IBM
// Storage Scale): owns the free-text search, the row-selection handler, and the
// bulk-select control, keeping selections hidden by an active search intact.
//
// Selection preservation across the search (`mergePreservedSelection`) is an
// internal detail here so callers don't have to re-wire it at every site: a
// search-filtered table reports selections only among the currently-visible
// rows, so both the per-row handler and the bulk actions re-attach the
// search-hidden selection before reporting upward.
export const useNodeSelection = ({
  nodes,
  selectedNodes,
  onChange,
  isNodeSelectable,
}: UseNodeSelectionArgs) => {
  const { query, setQuery, filteredNodes } = useNodeSearch(nodes);

  // The table reports only the visible (search-matched) rows, so merge them
  // back with selections hidden by the active search.
  const handleRowSelection = React.useCallback(
    (visibleSelected: NodeData[]) => {
      onChange(
        mergePreservedSelection(selectedNodes, visibleSelected, filteredNodes)
      );
    },
    [onChange, selectedNodes, filteredNodes]
  );

  // "Select all / none" operates on the visible, selectable rows and likewise
  // preserves search-hidden selections (handled inside `useNodeBulkSelect`).
  const selectableFilteredNodes = React.useMemo(
    () => filteredNodes.filter(isNodeSelectable ?? isNotBeingDeleted),
    [filteredNodes, isNodeSelectable]
  );
  const bulkSelect = useNodeBulkSelect({
    selectableNodes: selectableFilteredNodes,
    selectedNodes,
    onChange,
  });

  return { query, setQuery, filteredNodes, handleRowSelection, bulkSelect };
};
