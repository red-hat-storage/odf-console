import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { OnSelect } from '@patternfly/react-table';

export const useSelectList = <R extends K8sResourceCommon>(
  data: R[],
  visibleRows: Set<string>,
  preSelectAll: boolean = false,
  onRowSelected: (rows: R[]) => void
): {
  onSelect: OnSelect;
  selectedRows: Set<string>;
  updateSelectedRows: (rows: R[]) => void;
} => {
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(
    preSelectAll && visibleRows
  );

  const onSelect = React.useCallback(
    (_event, isSelected, rowIndex, rowData) => {
      const uniqueUIDs: Set<string> = selectedRows
        ? new Set([...selectedRows])
        : new Set<string>();

      if (rowIndex === -1) {
        isSelected
          ? visibleRows.forEach((uid) => uniqueUIDs.add(uid))
          : visibleRows.forEach((uid) => uniqueUIDs.delete(uid));
      } else {
        isSelected
          ? uniqueUIDs.add(rowData?.props?.id)
          : uniqueUIDs.delete(rowData?.props?.id);
      }
      setSelectedRows(uniqueUIDs);
      onRowSelected(data.filter((row) => uniqueUIDs.has(row.metadata.uid)));
    },
    [data, onRowSelected, selectedRows, visibleRows]
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
