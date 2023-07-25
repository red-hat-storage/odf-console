import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { SortByDirection } from '@patternfly/react-table';

export const useSortList = <R extends K8sResourceCommon>(
  data: R[],
  columns: any[],
  // True indicate the column index is starting from 1
  onSelect: boolean
): {
  onSort: (
    event: React.MouseEvent,
    columnIndex: number,
    sortByDirection: any
  ) => void;
  sortIndex: number;
  sortDirection: SortByDirection;
  sortedData: R[];
} => {
  const [sortIndex, setSortIndex] = React.useState(-1);
  const [sortDirection, setSortDirection] = React.useState<SortByDirection>(
    SortByDirection.asc
  );

  const onSort = React.useCallback(
    (event: React.MouseEvent, columnIndex: number, sortByDirection: any) => {
      setSortIndex(columnIndex);
      setSortDirection(sortByDirection);
    },
    [setSortIndex, setSortDirection]
  );

  const sortedData = React.useMemo(() => {
    return sortIndex !== -1
      ? data.sort((a, b) => {
          const index = onSelect ? sortIndex - 1 : sortIndex;
          return columns[index].sortFunction(a, b, sortDirection);
        })
      : data;
    // columns is not a state variable so its value will not change, but its reference might change on every re-render of parent component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortIndex, sortDirection, onSelect]);

  return {
    onSort,
    sortIndex,
    sortDirection,
    sortedData,
  };
};
