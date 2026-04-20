import * as React from 'react';
import { StatusBox } from '@odf/shared/generic/status-box';
import {
  Table as PfTable,
  OnSort,
  SortByDirection,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  TableVariant,
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
  variant?: TableVariant;
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
    variant,
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
        <Th key={columnIndex} className={column.className} {...sortParams}>
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
        skeleton={<div className="loading-skeleton--table pf-v6-u-mt-lg" />}
      >
        <PfTable aria-label={ariaLabel} variant={variant}>
          <Thead>
            <Tr>{headerColumns}</Tr>
          </Thead>
          <Tbody>
            {rowData?.map((row, index) => (
              <Tr key={index}>
                {row.map((item: React.ReactNode, cellIndex: number) => (
                  <Td
                    key={`${cellIndex}_${index}`}
                    className={classNames[cellIndex]}
                  >
                    {item}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </PfTable>
      </StatusBox>
    );
  }
);

export default Table;
