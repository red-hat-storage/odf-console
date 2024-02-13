import * as React from 'react';
import { StatusBox } from '@odf/shared/generic/status-box';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  TableComposable,
  Tbody,
  Td,
  Th,
  ThProps,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { useSelectList } from '../hooks/select-list';
import { useSortList } from '../hooks/sort-list';
import { getUID } from '../selectors';
import { TableColumnProps, RowComponentType } from './composable-table';

const isRowSelectable = <T extends K8sResourceCommon>(row: T) =>
  !row?.metadata?.deletionTimestamp;

const areAllRowsSelected = <T extends K8sResourceCommon>(
  selectableRows: T[],
  selectedRows: T[]
) => {
  const selectedRowIds = selectedRows?.map(getUID);
  const selecteableRowsIds = selectableRows.map(getUID);
  return (
    selecteableRowsIds?.length &&
    selecteableRowsIds.every((rowId) => selectedRowIds?.includes(rowId))
  );
};

const isRowSelected = <T extends K8sResourceCommon>(
  rowId: string,
  selectedRows: T[]
) => selectedRows.some((row) => getUID(row) === rowId);

const canApplyInitialSort = (
  columns: TableColumnProps[],
  initialSortIndex: number
): boolean => !!columns[initialSortIndex]?.sortFunction;

export const SelectableTable: SelectableTableProps = <
  T extends K8sResourceCommon
>({
  selectedRows,
  setSelectedRows,
  columns,
  rows,
  RowComponent,
  extraProps,
  isSelectableHidden,
  loaded,
  loadError,
  emptyRowMessage,
  initialSortColumnIndex,
  borders,
  className,
}) => {
  const {
    onSort,
    sortIndex: activeSortIndex,
    sortDirection: activeSortDirection,
    sortedData: sortedRows,
  } = useSortList<T>(
    rows,
    columns,
    false,
    canApplyInitialSort(columns, initialSortColumnIndex)
      ? initialSortColumnIndex
      : -1
  );

  const [selectableRows, rowIds] = React.useMemo(() => {
    const selectableRows = sortedRows?.filter(isRowSelectable) || [];
    const rowIds = new Set(selectableRows?.map(getUID));
    return [selectableRows, rowIds];
  }, [sortedRows]);

  const { onSelect } = useSelectList<T>(
    selectableRows,
    rowIds,
    false,
    setSelectedRows
  );

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
    },
    onSort: onSort,
    columnIndex,
  });

  return (
    <StatusBox
      loadError={loadError}
      loaded={loaded}
      EmptyMsg={emptyRowMessage}
      data={sortedRows}
      skeleton={<div className="loading-skeleton--table pf-u-mt-lg" />}
    >
      <TableComposable
        className={className}
        translate={null}
        aria-label="Selectable table"
        variant="compact"
        borders={borders}
      >
        <Thead translate={null}>
          <Tr translate={null}>
            <Th
              translate={null}
              {...(!isSelectableHidden
                ? {
                    select: {
                      onSelect: onSelect,
                      isSelected: areAllRowsSelected(
                        selectableRows,
                        selectedRows
                      ),
                    },
                  }
                : {})}
            />
            {columns?.map((col, index) => (
              <Th
                {...(!!col?.thProps ? col.thProps : {})}
                {...(!!col?.sortFunction ? { sort: getSortParams(index) } : {})}
                translate={null}
                key={col?.columnName}
              >
                {col?.columnName}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody translate={null}>
          {sortedRows.map((row, rowIndex) => (
            <Tr translate={null} key={getUID(row)}>
              <Td
                translate={null}
                {...(!isSelectableHidden
                  ? {
                      select: {
                        rowIndex,
                        onSelect: onSelect,
                        isSelected: isRowSelected(getUID(row), selectedRows),
                        disable: !isRowSelectable(row),
                        props: {
                          id: getUID(row),
                        },
                      },
                    }
                  : {})}
              />
              <RowComponent row={row} extraProps={extraProps} />
            </Tr>
          ))}
        </Tbody>
      </TableComposable>
    </StatusBox>
  );
};

type TableProps<T extends K8sResourceCommon> = {
  rows: T[];
  columns: TableColumnProps[];
  RowComponent: React.ComponentType<RowComponentType<T>>;
  selectedRows: T[];
  setSelectedRows: (selectedRows: T[]) => void;
  extraProps?: any;
  // A temporary prop for MCO to hide disable DR
  isSelectableHidden?: boolean;
  loaded: boolean;
  loadError?: any;
  emptyRowMessage?: React.FC;
  initialSortColumnIndex?: number;
  /** Render borders */
  borders?: boolean;
  /** Additional classes added to the Table  */
  className?: string;
};

type SelectableTableProps = <T extends K8sResourceCommon>(
  props: React.PropsWithoutRef<TableProps<T>>
) => ReturnType<React.FC>;
