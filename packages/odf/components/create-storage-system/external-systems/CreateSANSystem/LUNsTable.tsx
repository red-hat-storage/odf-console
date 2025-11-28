import * as React from 'react';
import { DiscoveredDevice } from '@odf/core/types/scale';
import { DASH, useCustomTranslation } from '@odf/shared';
import { TableSkeletonLoader } from '@odf/shared/skeletal-loader/TableSkeleton';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  ListPageFilter,
  useListPageFilter,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  OnSelect,
  SortByDirection,
} from '@patternfly/react-table';
import './LUNsTable.scss';

type LUNsTableProps = {
  luns: DiscoveredDevice[];
  selectedLUNs: Set<string>;
  onLUNSelect: (selectedLUNs: Set<string>) => void;
  loaded?: boolean;
};

export const LUNsTable: React.FC<LUNsTableProps> = ({
  luns,
  selectedLUNs,
  onLUNSelect,
  loaded = true,
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
        case 0: // Path
          aValue = a.path;
          bValue = b.path;
          break;
        case 1: // WWID
          aValue = a.WWN || '';
          bValue = b.WWN || '';
          break;
        case 2: // Capacity
          aValue = a.size || 0;
          bValue = b.size || 0;
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

  const handleSort = React.useCallback(
    (
      _event: React.MouseEvent,
      columnIndex: number,
      direction: SortByDirection
    ) => {
      setSortBy({ index: columnIndex, direction });
    },
    []
  );

  const areAllSelected = React.useMemo(() => {
    return luns.length > 0 && luns.every((lun) => selectedLUNs.has(lun.WWN));
  }, [luns, selectedLUNs]);

  const handleSelectAll: OnSelect = React.useCallback(
    (_event, isSelected) => {
      const newSelected = new Set(selectedLUNs);
      if (isSelected) {
        luns.forEach((lun) => newSelected.add(lun.WWN));
      } else {
        luns.forEach((lun) => newSelected.delete(lun.WWN));
      }
      onLUNSelect(newSelected);
    },
    [luns, selectedLUNs, onLUNSelect]
  );

  const handleRowSelect: OnSelect = React.useCallback(
    (_event, isSelected, rowIndex, rowData) => {
      // rowIndex is -1 for select all, otherwise it's the row index
      if (rowIndex === -1) {
        // This is select all - should not happen for individual row selection
        return;
      }

      // Use rowData.props.id if available (more reliable than rowIndex)
      const lunWWID =
        rowData?.props?.id ||
        (rowIndex >= 0 && rowIndex < sortedLUNs.length
          ? sortedLUNs[rowIndex]?.WWN
          : null);

      if (!lunWWID) {
        return;
      }

      const newSelected = new Set(selectedLUNs);
      if (isSelected) {
        newSelected.add(lunWWID);
      } else {
        newSelected.delete(lunWWID);
      }
      onLUNSelect(newSelected);
    },
    [sortedLUNs, selectedLUNs, onLUNSelect]
  );

  const [lunsData, lunsFilteredData, onLunsFilterChange] = useListPageFilter(
    sortedLUNs.map((lun) => ({ ...lun, metadata: { name: lun.path } })),
    []
  );
  if (!loaded) {
    return <TableSkeletonLoader columns={4} rows={5} />;
  }

  return (
    <div className="odf-luns-table">
      <ListPageFilter
        data={lunsData}
        loaded={loaded}
        onFilterChange={onLunsFilterChange}
        hideColumnManagement={true}
      />
      <div className="odf-luns-table__body-container">
        <Table
          variant="compact"
          aria-label={t('LUNs table')}
          className="odf-luns-table__table"
        >
          <Thead>
            <Tr>
              <Th
                select={{
                  onSelect: handleSelectAll,
                  isSelected: areAllSelected,
                }}
                aria-label={t('Select all')}
              />
              <Th
                sort={{
                  sortBy: sortBy,
                  onSort: handleSort,
                  columnIndex: 0,
                }}
              >
                {t('Path')}
              </Th>
              <Th
                sort={{
                  sortBy: sortBy,
                  onSort: handleSort,
                  columnIndex: 1,
                }}
              >
                {t('WWID')}
              </Th>
              <Th
                sort={{
                  sortBy: sortBy,
                  onSort: handleSort,
                  columnIndex: 2,
                }}
              >
                {t('Capacity')}
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {lunsFilteredData.map((lun, index) => (
              <Tr key={lun.WWN || lun.path}>
                <Td
                  select={{
                    rowIndex: index,
                    onSelect: handleRowSelect,
                    isSelected: selectedLUNs.has(lun.WWN),
                    props: {
                      id: lun.WWN,
                    },
                  }}
                />
                <Td>{lun.path}</Td>
                <Td>{lun.WWN || DASH}</Td>
                <Td>{humanizeBinaryBytes(lun.size).string || '-'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
};
