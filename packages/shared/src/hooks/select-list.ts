import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { OnSelect } from '@patternfly/react-table';

const handleCheckboxSelect = (
  isSelected,
  rowIndex,
  rowData,
  visibleRows,
  selectedRows
) => {
  const uniqueUIDs = selectedRows ? new Set([...selectedRows]) : new Set();

  if (rowIndex === -1) {
    // Select/deselect all rows
    isSelected
      ? visibleRows.forEach((uid) => uniqueUIDs.add(uid))
      : visibleRows.forEach((uid) => uniqueUIDs.delete(uid));
  } else {
    // Select/deselect individual row
    isSelected
      ? uniqueUIDs.add(rowData?.props?.id)
      : uniqueUIDs.delete(rowData?.props?.id);
  }

  return uniqueUIDs;
};

export const useSelectList = <R extends K8sResourceCommon>(
  data: R[],
  visibleRows: Set<string>,
  preSelectAll: boolean = false,
  onRowSelected: (rows: R[]) => void,
  selectionType: 'radio' | 'checkbox' = 'checkbox',
  /** When provided (controlled mode), use this as current selection for toggles instead of internal state */
  selectedRowIds?: Set<string>
): {
  onSelect: OnSelect;
  selectedRows: Set<string>;
  updateSelectedRows: (rows: R[]) => void;
} => {
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(
    preSelectAll && visibleRows
  );

  const handleRadioSelect = (isSelected, rowData) => {
    // For radio, only one row can be selected
    return isSelected ? new Set([rowData?.props?.id]) : new Set();
  };

  // In controlled mode use parent's selection as baseline for computing toggles
  const currentSelectedIds = selectedRowIds ?? selectedRows;

  const onSelect = React.useCallback(
    (_event, isSelected, rowIndex, rowData) => {
      let updatedSelectedRows;

      if (selectionType === 'radio') {
        updatedSelectedRows = handleRadioSelect(isSelected, rowData);
      } else {
        updatedSelectedRows = handleCheckboxSelect(
          isSelected,
          rowIndex,
          rowData,
          visibleRows,
          currentSelectedIds
        );
      }

      setSelectedRows(updatedSelectedRows);
      onRowSelected(
        data.filter((row) => updatedSelectedRows.has(row.metadata.uid))
      );
    },
    [data, onRowSelected, currentSelectedIds, visibleRows, selectionType]
  );

  const updateSelectedRows = React.useCallback(
    (rows: R[]) => {
      onRowSelected(rows);
      setSelectedRows(new Set(rows.map((row) => row.metadata.uid)));
    },
    [onRowSelected]
  );

  return {
    onSelect,
    selectedRows,
    updateSelectedRows,
  };
};
