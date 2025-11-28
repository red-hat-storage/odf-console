import * as React from 'react';
import { DASH } from '@odf/shared';
import {
  dateTimeFormatter,
  formatPrometheusDuration,
} from '@odf/shared/details-page/datetime';
import {
  SelectableTable,
  TableColumnProps,
  RowComponentType,
  TableVariant,
} from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Td } from '@patternfly/react-table';
import { AlertRowData } from './hooks';
import { getSeverityIcon } from './utils';
import './health-overview.scss';

const RowRenderer: React.FC<RowComponentType<AlertRowData>> = ({ row }) => {
  const endTimeDisplay = row.endTime
    ? dateTimeFormatter.format(row.endTime)
    : DASH;
  // Remove seconds from duration display, show '0m' for very short durations
  const durationDisplay =
    formatPrometheusDuration(row.duration)
      .replace(/\d+s\s*$/, '')
      .trim() || '0m';
  const startTimeDisplay = dateTimeFormatter.format(row.startTime);
  const severityIcon = getSeverityIcon(row.severity);

  return (
    <>
      <Td>{endTimeDisplay}</Td>
      <Td>{durationDisplay}</Td>
      <Td>{startTimeDisplay}</Td>
      <Td>
        {severityIcon}
        {row.alertname}
      </Td>
      <Td>{row.message}</Td>
    </>
  );
};

type AlertsTableProps = {
  alerts: AlertRowData[];
  loaded: boolean;
  error?: any;
  selectedRows?: AlertRowData[];
  setSelectedRows?: (rows: AlertRowData[]) => void;
  isColumnSelectable?: boolean;
  className?: string;
};

export const AlertsTable: React.FC<AlertsTableProps> = ({
  alerts,
  loaded,
  error,
  selectedRows,
  setSelectedRows,
  isColumnSelectable = false,
  className = 'health-overview__alerts-table',
}) => {
  const { t } = useCustomTranslation();

  const columns = React.useMemo<TableColumnProps[]>(
    () => [
      {
        columnName: t('End time'),
        sortFunction: (a, b, c) => {
          const aTime = (a as AlertRowData).endTime?.getTime() || 0;
          const bTime = (b as AlertRowData).endTime?.getTime() || 0;
          return c === 'asc' ? aTime - bTime : bTime - aTime;
        },
      },
      {
        columnName: t('Duration'),
        sortFunction: (a, b, c) => {
          const diff =
            (b as AlertRowData).duration - (a as AlertRowData).duration;
          return c === 'asc' ? -diff : diff;
        },
      },
      {
        columnName: t('Start time'),
        sortFunction: (a, b, c) => {
          const diff =
            (b as AlertRowData).startTime.getTime() -
            (a as AlertRowData).startTime.getTime();
          return c === 'asc' ? -diff : diff;
        },
      },
      {
        columnName: t('Check'),
        sortFunction: (a, b, c) => {
          const cmp = (a as AlertRowData).alertname.localeCompare(
            (b as AlertRowData).alertname
          );
          return c === 'asc' ? cmp : -cmp;
        },
      },
      {
        columnName: t('Details'),
      },
    ],
    [t]
  );

  return (
    <SelectableTable
      rows={alerts}
      columns={columns}
      RowComponent={RowRenderer}
      selectedRows={selectedRows}
      setSelectedRows={setSelectedRows}
      loaded={loaded}
      loadError={error}
      initialSortColumnIndex={2}
      borders={true}
      variant={TableVariant.COMPACT}
      className={className}
      isColumnSelectableHidden={!isColumnSelectable}
    />
  );
};
