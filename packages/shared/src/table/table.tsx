import * as React from 'react';
import { StatusBox } from '@odf/shared/generic/status-box';
import {
  OnSort,
  SortByDirection,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';

export type Column = {
  columnName: string;
  className?: string;
  sortFunction?: (a: any, b: any, c: SortByDirection) => any;
};

export type RowData = [];

type TableProps = {
  columns: Column[];
  rowRenderer: (rawData: []) => RowData;
  rawData: [];
  ariaLabel: string;
  loaded?: boolean;
  loadError?: any;
  unfilteredData?: [];
  noDataMsg?: React.FC;
  emptyRowMessage?: React.FC;
};

const Table: React.FC<TableProps> = React.memo(
  ({
    ariaLabel,
    columns,
    rawData,
    rowRenderer,
    loaded = true,
    loadError = null,
    unfilteredData,
    noDataMsg,
    emptyRowMessage,
  }) => {
    const [sortIndex, setSortIndex] = React.useState(-1);
    const [sortDirection, setSortDirection] = React.useState<SortByDirection>(
      SortByDirection.asc
    );

    const onSort: OnSort = (
      _event: React.MouseEvent,
      columnIndex: number,
      sortByDirection: SortByDirection
    ) => {
      setSortIndex(columnIndex);
      setSortDirection(sortByDirection);
    };

    const sortedData =
      sortIndex !== -1
        ? rawData?.sort((a, b) => {
            return columns[sortIndex].sortFunction(a, b, sortDirection);
          })
        : rawData;
    const rowData = sortedData?.length > 0 ? sortedData.map(rowRenderer) : [];

    const classNames = columns.map((column) => column.className);

    const headerColumns = columns.map((column, columnIndex) => {
      const isSortable = !!column.sortFunction;
      const sortParams = isSortable
        ? {
            sort: {
              sortBy: {
                index: sortIndex,
                direction: sortDirection,
              },
              onSort,
              columnIndex,
            },
          }
        : {};
      return (
        <Th
          key={columnIndex}
          className={column.className}
          {...sortParams}
          translate={null}
        >
          {column.columnName}
        </Th>
      );
    });

    return (
      <StatusBox
        loadError={loadError}
        loaded={loaded}
        EmptyMsg={emptyRowMessage}
        data={rawData}
        unfilteredData={unfilteredData}
        NoDataEmptyMsg={noDataMsg}
        skeleton={<div className="loading-skeleton--table pf-u-mt-lg" />}
      >
        <TableComposable aria-label={ariaLabel} translate={null}>
          <Thead translate={null}>
            <Tr translate={null}>{headerColumns}</Tr>
          </Thead>
          <Tbody translate={null}>
            {rowData?.map((row, index) => (
              <Tr key={index} translate={null}>
                {row.map((item: React.ReactNode, cellIndex: number) => (
                  <Td
                    translate={null}
                    key={`${cellIndex}_${index}`}
                    className={classNames[cellIndex]}
                  >
                    {item}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </TableComposable>
      </StatusBox>
    );
  }
);

export default Table;
