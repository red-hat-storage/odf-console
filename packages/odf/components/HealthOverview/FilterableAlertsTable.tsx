import * as React from 'react';
import { fuzzyCaseInsensitive } from '@odf/shared/utils';
import { AlertsTable } from './AlertsTable';
import { HealthOverviewFilterToolbox } from './HealthOverviewFilterToolbox';
import { AlertRowData } from './hooks';
import { SEVERITY_MAP, parseDateTimeToTimestamp } from './utils';

type FilterableAlertsTableProps = {
  alerts: AlertRowData[];
  loaded: boolean;
  error?: any;
  onSilenceClick?: (selectedAlerts: AlertRowData[]) => void;
  onFilteredAlertsChange?: (filteredAlerts: AlertRowData[]) => void;
};

export const FilterableAlertsTable: React.FC<FilterableAlertsTableProps> = ({
  alerts,
  loaded,
  error,
  onSilenceClick,
  onFilteredAlertsChange,
}) => {
  // State hooks
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

  // Refs - Track previous filtered alerts to avoid unnecessary updates
  const prevFilteredAlertsRef = React.useRef<AlertRowData[]>([]);

  // Memoized values - Filter the alerts based on all criteria
  const filteredAlerts = React.useMemo(
    () =>
      alerts.filter((alert) => {
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

        // Filter by search text using fuzzy matching
        if (searchValue.trim()) {
          const matchesName = fuzzyCaseInsensitive(
            searchValue,
            alert.alertname
          );
          const matchesMessage = fuzzyCaseInsensitive(
            searchValue,
            alert.message
          );
          if (!matchesName && !matchesMessage) {
            return false;
          }
        }

        return true;
      }),
    [
      alerts,
      checkTypeFilter,
      startDate,
      startTime,
      endDate,
      endTime,
      searchValue,
    ]
  );

  // Derive valid selected alerts based on current filtered alerts
  const validSelectedAlerts = React.useMemo(() => {
    const filteredIds = new Set(
      filteredAlerts.map((alert) => alert.metadata.uid)
    );
    return selectedAlerts.filter((alert) =>
      filteredIds.has(alert.metadata.uid)
    );
  }, [filteredAlerts, selectedAlerts]);

  // Filter out already-ended alerts - only active (firing) alerts can be silenced
  const silenceableAlerts = React.useMemo(
    () => validSelectedAlerts.filter((alert) => !alert.endTime),
    [validSelectedAlerts]
  );

  // Callbacks
  const handleSilenceClick = React.useCallback(() => {
    if (silenceableAlerts.length > 0 && onSilenceClick) {
      onSilenceClick(silenceableAlerts);
      // Clear selections immediately to disable the button
      // to make sure user cannot click the button multiple times
      setSelectedAlerts([]);
    }
  }, [silenceableAlerts, onSilenceClick]);

  // Effects - Notify parent when filtered alerts change
  React.useEffect(() => {
    if (!onFilteredAlertsChange) {
      return;
    }

    // Only notify if the filtered alerts have actually changed
    const prev = prevFilteredAlertsRef.current;
    if (
      filteredAlerts.length !== prev.length ||
      filteredAlerts.some(
        (alert, index) => alert.metadata.uid !== prev[index]?.metadata.uid
      )
    ) {
      prevFilteredAlertsRef.current = filteredAlerts;
      onFilteredAlertsChange(filteredAlerts);
    }
  }, [filteredAlerts, onFilteredAlertsChange]);

  const isSilenceEnabled = silenceableAlerts.length > 0;

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
        selectedRows={validSelectedAlerts}
        setSelectedRows={setSelectedAlerts}
        isColumnSelectable={true}
      />
    </>
  );
};
