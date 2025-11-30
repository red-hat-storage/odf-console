import * as React from 'react';
import { AlertsTable } from './AlertsTable';
import { HealthOverviewFilterToolbox } from './HealthOverviewFilterToolbox';
import { AlertRowData } from './hooks';

type FilterableAlertsTableProps = {
  alerts: AlertRowData[];
  loaded: boolean;
  error?: any;
  onSilenceClick?: (selectedAlerts: AlertRowData[]) => void;
};

// Map filter severity values to actual Prometheus severity labels
const SEVERITY_MAP: Record<string, string> = {
  critical: 'critical',
  moderate: 'warning',
  minor: 'info',
};

// Parse date and time strings into a Date object
const parseDateTimeToTimestamp = (
  dateStr: string,
  timeStr: string
): number | null => {
  if (!dateStr || !timeStr) {
    return null;
  }

  try {
    // Parse the date (YYYY-MM-DD format)
    const [year, month, day] = dateStr.split('-').map(Number);

    // Parse the time (hh:mm AM/PM format)
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) {
      return null;
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3].toUpperCase();

    // Convert to 24-hour format
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    const date = new Date(year, month - 1, day, hours, minutes);
    return date.getTime();
  } catch (_e) {
    return null;
  }
};

export const FilterableAlertsTable: React.FC<FilterableAlertsTableProps> = ({
  alerts,
  loaded,
  error,
  onSilenceClick,
}) => {
  const [selectedAlerts, setSelectedAlerts] = React.useState<AlertRowData[]>(
    []
  );

  // Filter states
  const [checkTypeFilter, setCheckTypeFilter] = React.useState('all');
  const [startDate, setStartDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [searchValue, setSearchValue] = React.useState('');

  // Filter the alerts based on all criteria
  const filteredAlerts = React.useMemo(() => {
    return alerts.filter((alert) => {
      // Filter by check type (severity)
      if (checkTypeFilter !== 'all') {
        const targetSeverity = SEVERITY_MAP[checkTypeFilter];
        if (targetSeverity && alert.severity !== targetSeverity) {
          return false;
        }
      }

      // Filter by start date/time
      const startTimestamp = parseDateTimeToTimestamp(startDate, startTime);
      if (startTimestamp !== null) {
        if (alert.startTime.getTime() < startTimestamp) {
          return false;
        }
      }

      // Filter by end date/time
      const endTimestamp = parseDateTimeToTimestamp(endDate, endTime);
      if (endTimestamp !== null) {
        if (alert.startTime.getTime() > endTimestamp) {
          return false;
        }
      }

      // Filter by search text
      if (searchValue.trim()) {
        const searchLower = searchValue.toLowerCase();
        const matchesName = alert.alertname.toLowerCase().includes(searchLower);
        const matchesMessage = alert.message
          .toLowerCase()
          .includes(searchLower);
        if (!matchesName && !matchesMessage) {
          return false;
        }
      }

      return true;
    });
  }, [
    alerts,
    checkTypeFilter,
    startDate,
    startTime,
    endDate,
    endTime,
    searchValue,
  ]);

  // Clear selected alerts when filtered alerts change
  React.useEffect(() => {
    setSelectedAlerts((prevSelected) => {
      const filteredIds = new Set(
        filteredAlerts.map((alert) => alert.metadata.uid)
      );
      return prevSelected.filter((alert) =>
        filteredIds.has(alert.metadata.uid)
      );
    });
  }, [filteredAlerts]);

  const handleSilenceClick = React.useCallback(() => {
    if (selectedAlerts.length > 0 && onSilenceClick) {
      onSilenceClick(selectedAlerts);
    }
  }, [selectedAlerts, onSilenceClick]);

  const isSilenceEnabled = selectedAlerts.length > 0;

  return (
    <>
      <HealthOverviewFilterToolbox
        checkTypeFilter={checkTypeFilter}
        onCheckTypeFilterChange={setCheckTypeFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        startTime={startTime}
        onStartTimeChange={setStartTime}
        endDate={endDate}
        onEndDateChange={setEndDate}
        endTime={endTime}
        onEndTimeChange={setEndTime}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSilenceClick={handleSilenceClick}
        isSilenceEnabled={isSilenceEnabled}
      />
      <AlertsTable
        alerts={filteredAlerts}
        loaded={loaded}
        error={error}
        selectedRows={selectedAlerts}
        setSelectedRows={setSelectedAlerts}
        isColumnSelectable={true}
      />
    </>
  );
};
