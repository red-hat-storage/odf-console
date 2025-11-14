import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  ThProps,
  SortByDirection,
  OnSelect,
} from '@patternfly/react-table';
import { LUN } from './types';

type LUNsTableProps = {
  luns: LUN[];
  selectedLUNs: Set<string>;
  onLUNSelect: (selectedLUNs: Set<string>) => void;
};

export const LUNsTable: React.FC<LUNsTableProps> = ({
  luns,
  selectedLUNs,
  onLUNSelect,
}) => {
  const { t } = useCustomTranslation();
  const [sortBy, setSortBy] = React.useState<{
    index: number;
    direction: SortByDirection;
  }>({ index: 1, direction: SortByDirection.asc });

  const sortedLUNs = React.useMemo(() => {
    const sorted = [...luns];
    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy.index) {
        case 1: // LUN name
          aValue = a.name;
          bValue = b.name;
          break;
        case 2: // ID
          aValue = a.id;
          bValue = b.id;
          break;
        case 3: // Capacity
          aValue = a.capacity;
          bValue = b.capacity;
          break;
        default:
          return 0;
      }

      const comparison =
        typeof aValue === 'string' && typeof bValue === 'string'
          ? aValue.localeCompare(bValue)
          : typeof aValue === 'number' && typeof bValue === 'number'
            ? aValue - bValue
            : String(aValue).localeCompare(String(bValue));

      return sortBy.direction === SortByDirection.asc
        ? comparison
        : -comparison;
    });
    return sorted;
  }, [luns, sortBy]);

  const onSort = React.useCallback(
    (
      _event: React.MouseEvent,
      columnIndex: number,
      direction: SortByDirection
    ) => {
      setSortBy({ index: columnIndex, direction });
    },
    []
  );

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: sortBy.index,
      direction: sortBy.direction,
    },
    onSort,
    columnIndex,
  });

  const areAllLUNsSelected = React.useMemo(() => {
    return luns.length > 0 && luns.every((lun) => selectedLUNs.has(lun.name));
  }, [luns, selectedLUNs]);

  const onSelect: OnSelect = React.useCallback(
    (_event, isSelected, rowIndex) => {
      const newSelected = new Set(selectedLUNs);

      if (rowIndex === -1) {
        // Select/deselect all
        if (isSelected) {
          sortedLUNs.forEach((lun) => newSelected.add(lun.name));
        } else {
          sortedLUNs.forEach((lun) => newSelected.delete(lun.name));
        }
      } else {
        // Select/deselect individual row
        const lun = sortedLUNs[rowIndex];
        if (lun) {
          if (isSelected) {
            newSelected.add(lun.name);
          } else {
            newSelected.delete(lun.name);
          }
        }
      }

      onLUNSelect(newSelected);
    },
    [selectedLUNs, sortedLUNs, onLUNSelect]
  );

  return (
    <Table aria-label={t('LUNs table')} variant="compact">
      <Thead>
        <Tr>
          <Th
            select={{
              onSelect,
              isSelected: areAllLUNsSelected,
            }}
            aria-label={t('Select all')}
          />
          <Th sort={getSortParams(1)}>{t('LUN')}</Th>
          <Th sort={getSortParams(2)}>{t('ID')}</Th>
          <Th sort={getSortParams(3)}>{t('Capacity')}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {sortedLUNs.map((lun, rowIndex) => (
          <Tr key={lun.name}>
            <Td
              select={{
                rowIndex,
                onSelect,
                isSelected: selectedLUNs.has(lun.name),
                props: {
                  id: lun.name,
                },
              }}
            />
            <Td>{lun.name}</Td>
            <Td>{lun.id || t('Content cell')}</Td>
            <Td>{lun.capacity || t('Content cell')}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
