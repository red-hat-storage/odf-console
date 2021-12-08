import * as React from 'react';
import * as _ from 'lodash';
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
  rowRenderer: (rawData: []) => RowData[];
  rawData: [];
  ariaLabel: string;
};

const Table: React.FC<TableProps> = (props) => {
  const { ariaLabel, columns, rawData, rowRenderer } = props;
  const [sortIndex, setSortIndex] = React.useState(-1);
  const [sortDirection, setSortDirection] = React.useState<SortByDirection>(
    SortByDirection.asc
  );

  const onSort: OnSort = (
    event: React.MouseEvent,
    columnIndex: number,
    sortByDirection: SortByDirection
  ) => {
    setSortIndex(columnIndex);
    setSortDirection(sortByDirection);
  };

  const sortedData =
    sortIndex !== -1
      ? rawData.sort((a, b) => {
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
    <TableComposable aria-label={ariaLabel} translate={null}>
      <Thead translate={null}>
        <Tr translate={null}>{...headerColumns}</Tr>
      </Thead>
      <Tbody translate={null}>
        {rowData?.map((row, index) => (
          <Tr key={index} translate={null}>
            {row.map((item, cellIndex) => (
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
  );
};

export default Table;
