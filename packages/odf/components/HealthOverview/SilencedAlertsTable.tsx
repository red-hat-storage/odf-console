import * as React from 'react';
import { DASH, getAlertManagerSilenceEndpoint } from '@odf/shared';
import { dateTimeFormatter } from '@odf/shared/details-page/datetime';
import { StorageClusterModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  SelectableTable,
  TableColumnProps,
  RowComponentType,
  TableVariant,
} from '@odf/shared/table';
import { StorageClusterKind, Patch } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { fuzzyCaseInsensitive } from '@odf/shared/utils';
import { consoleFetch, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Divider,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import { SilencedAlertRowData, SilenceTypes } from './hooks';
import { getSeverityIcon, SEVERITY_MAP } from './utils';
import './health-overview.scss';

type SilencedAlertsTableProps = {
  alerts: SilencedAlertRowData[];
  loaded: boolean;
  error?: any;
  alertManagerBasePath: string;
  onRefresh: () => void;
  storageCluster?: StorageClusterKind;
};

const RowRenderer: React.FC<RowComponentType<SilencedAlertRowData>> = ({
  row,
}) => {
  const { t } = useCustomTranslation();
  const isIndefinite = row.silenceType === SilenceTypes.INDEFINITE;

  // Check if silencedOn is a valid date (not epoch which is used as placeholder for indefinite)
  const isValidDate = row.silencedOn && row.silencedOn.getTime() > 0;
  const silencedOnDisplay = isValidDate
    ? dateTimeFormatter.format(row.silencedOn)
    : DASH;
  const untilDisplay = row.endsOn ? dateTimeFormatter.format(row.endsOn) : DASH;

  return (
    <>
      <Td dataLabel={t('Silenced on')}>
        <div>{silencedOnDisplay}</div>
        <div className="pf-v6-u-color-200">
          {isIndefinite
            ? t('Indefinite')
            : row.endsOn
              ? t('Until {{time}}', { time: untilDisplay })
              : DASH}
        </div>
      </Td>
      <Td dataLabel={t('Check')}>
        {getSeverityIcon(row.severity)}
        {row.alertname}
      </Td>
      <Td dataLabel={t('Details')}>{row.details}</Td>
    </>
  );
};

// Severity filter values
const SEVERITY_FILTERS = ['critical', 'moderate', 'minor'] as const;
// Silence type filter values
const SILENCE_TYPE_FILTERS = [
  SilenceTypes.INDEFINITE,
  SilenceTypes.TIME_BOUND,
] as const;

export const SilencedAlertsTable: React.FC<SilencedAlertsTableProps> = ({
  alerts,
  loaded,
  error,
  alertManagerBasePath,
  onRefresh,
  storageCluster,
}) => {
  const { t } = useCustomTranslation();
  const [selectedAlerts, setSelectedAlerts] = React.useState<
    SilencedAlertRowData[]
  >([]);
  const [nameFilter, setNameFilter] = React.useState('');
  const [selectedFilters, setSelectedFilters] = React.useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isUnsilencing, setIsUnsilencing] = React.useState(false);
  const [actionError, setActionError] = React.useState<any>();

  const filterOptions = React.useMemo(
    () => [
      { value: 'all', label: t('All checks'), isAllOption: true },
      { value: 'divider-top', label: '', isDivider: true },
      { value: 'critical', label: t('Critical'), category: 'severity' },
      { value: 'moderate', label: t('Moderate'), category: 'severity' },
      { value: 'minor', label: t('Minor'), category: 'severity' },
      { value: 'divider', label: '', isDivider: true },
      {
        value: SilenceTypes.INDEFINITE,
        label: t('Indefinite'),
        category: 'silenceType',
      },
      {
        value: SilenceTypes.TIME_BOUND,
        label: t('Time-bound'),
        category: 'silenceType',
      },
    ],
    [t]
  );

  const filteredAlerts = React.useMemo(() => {
    // Extract selected severity and silence type filters
    const selectedSeverities = selectedFilters.filter((f) =>
      SEVERITY_FILTERS.includes(f as (typeof SEVERITY_FILTERS)[number])
    );
    const selectedSilenceTypes = selectedFilters.filter((f) =>
      SILENCE_TYPE_FILTERS.includes(f as (typeof SILENCE_TYPE_FILTERS)[number])
    );

    return alerts.filter((alert) => {
      // If no filters selected, show all
      // If severity filters selected, alert must match one of them
      if (selectedSeverities.length > 0) {
        const alertSeverity = alert.severity.toLowerCase();
        const matchesSeverity = selectedSeverities.some((filter) => {
          const targetSeverity = SEVERITY_MAP[filter];
          return (
            targetSeverity && alertSeverity === targetSeverity.toLowerCase()
          );
        });
        if (!matchesSeverity) return false;
      }

      // If silence type filters selected, alert must match one of them
      if (selectedSilenceTypes.length > 0) {
        if (!selectedSilenceTypes.includes(alert.silenceType)) return false;
      }

      // Name filter
      const nameMatch =
        !nameFilter.trim() ||
        fuzzyCaseInsensitive(nameFilter, alert.alertname) ||
        fuzzyCaseInsensitive(nameFilter, alert.details);
      return nameMatch;
    });
  }, [alerts, selectedFilters, nameFilter]);

  const onFilterSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, selection: string) => {
      // Ignore divider clicks
      if (selection === 'divider' || selection === 'divider-top') return;

      // "All checks" clears all filters
      if (selection === 'all') {
        setSelectedFilters([]);
        setIsFilterOpen(false);
        return;
      }

      setSelectedFilters((prev) => {
        if (prev.includes(selection)) {
          // Remove if already selected
          return prev.filter((f) => f !== selection);
        } else {
          // Add to selection
          return [...prev, selection];
        }
      });
    },
    []
  );

  const clearFilters = React.useCallback(() => {
    setSelectedFilters([]);
  }, []);

  const onUnsilence = async () => {
    setIsUnsilencing(true);
    setActionError(undefined);
    try {
      // Segregate by type
      const indefiniteAlerts = selectedAlerts.filter(
        (a) => a.silenceType === SilenceTypes.INDEFINITE
      );
      const timeBoundAlerts = selectedAlerts.filter(
        (a) => a.silenceType === SilenceTypes.TIME_BOUND
      );

      const promises: Promise<unknown>[] = [];

      // Handle time-bound via Alertmanager DELETE
      if (timeBoundAlerts.length > 0 && alertManagerBasePath) {
        promises.push(
          ...timeBoundAlerts.map((alert) =>
            consoleFetch(
              getAlertManagerSilenceEndpoint(
                alertManagerBasePath,
                alert.silenceId
              ),
              {
                method: 'DELETE',
              }
            ).then((response) => {
              if (!response?.ok) {
                throw new Error(
                  `${response.status} ${response.statusText || t('Unknown error')}`
                );
              }
            })
          )
        );
      }

      // Handle indefinite via StorageCluster CR patch
      if (indefiniteAlerts.length > 0 && storageCluster) {
        const alertNamesToRemove = new Set(
          indefiniteAlerts.map((a) => a.alertname)
        );
        const currentExcludedAlerts =
          storageCluster.spec?.monitoring?.excludedAlerts || [];
        const newExcludedAlerts = currentExcludedAlerts.filter(
          (alert) => !alertNamesToRemove.has(alert.alertName)
        );

        // Skip patch if nothing changed (alerts to remove weren't in the list)
        if (newExcludedAlerts.length !== currentExcludedAlerts.length) {
          const patch: Patch[] =
            newExcludedAlerts.length === 0
              ? [{ op: 'remove', path: '/spec/monitoring/excludedAlerts' }]
              : [
                  {
                    op: 'replace',
                    path: '/spec/monitoring/excludedAlerts',
                    value: newExcludedAlerts,
                  },
                ];

          promises.push(
            k8sPatch({
              model: StorageClusterModel,
              resource: {
                metadata: {
                  name: getName(storageCluster),
                  namespace: getNamespace(storageCluster),
                },
              },
              data: patch,
            })
          );
        }
      }

      await Promise.all(promises);
      setSelectedAlerts([]);
    } catch (err) {
      setActionError(err);
    } finally {
      onRefresh();
      setIsUnsilencing(false);
    }
  };

  const columns = React.useMemo<TableColumnProps[]>(
    () => [
      {
        columnName: t('Silenced on'),
        sortFunction: (a, b, direction) => {
          const aTime = (a as SilencedAlertRowData).silencedOn?.getTime() || 0;
          const bTime = (b as SilencedAlertRowData).silencedOn?.getTime() || 0;
          return direction === 'asc' ? bTime - aTime : aTime - bTime;
        },
      },
      {
        columnName: t('Check'),
        sortFunction: (a, b, direction) => {
          const cmp = (a as SilencedAlertRowData).alertname.localeCompare(
            (b as SilencedAlertRowData).alertname
          );
          return direction === 'asc' ? cmp : -cmp;
        },
      },
      {
        columnName: t('Details'),
      },
    ],
    [t]
  );

  // Check if any selected alerts can be unsilenced
  const hasTimeBound = selectedAlerts.some(
    (a) => a.silenceType === SilenceTypes.TIME_BOUND
  );
  const hasIndefinite = selectedAlerts.some(
    (a) => a.silenceType === SilenceTypes.INDEFINITE
  );
  const canUnsilenceTimeBound = hasTimeBound && alertManagerBasePath;
  const canUnsilenceIndefinite = hasIndefinite && storageCluster;

  const isUnsilenceDisabled =
    !selectedAlerts.length ||
    isUnsilencing ||
    (hasTimeBound && !alertManagerBasePath) ||
    (hasIndefinite && !storageCluster) ||
    (!canUnsilenceTimeBound && !canUnsilenceIndefinite);

  const getFilterToggleText = React.useCallback(() => {
    if (selectedFilters.length === 0) {
      return t('All checks');
    }
    if (selectedFilters.length === 1) {
      return (
        filterOptions.find((opt) => opt.value === selectedFilters[0])?.label ||
        selectedFilters[0]
      );
    }
    // For multiple filters, just show "Filters" - the count is in the badge
    return t('Filters');
  }, [selectedFilters, filterOptions, t]);

  const renderFilterToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsFilterOpen((prev) => !prev)}
        isExpanded={isFilterOpen}
        badge={
          // Only show badge when multiple filters are selected
          selectedFilters.length > 1 ? (
            <span className="pf-v6-c-menu-toggle__count">
              {selectedFilters.length}
            </span>
          ) : undefined
        }
      >
        {getFilterToggleText()}
      </MenuToggle>
    ),
    [isFilterOpen, selectedFilters.length, getFilterToggleText]
  );

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <div className="odf-silenced-alerts__filter-wrapper">
            <ToolbarItem>
              <Select
                aria-label={t('Filter by type')}
                isOpen={isFilterOpen}
                toggle={renderFilterToggle}
                onOpenChange={setIsFilterOpen}
                onSelect={onFilterSelect}
                selected={selectedFilters}
                shouldFocusFirstItemOnOpen
              >
                <SelectList>
                  {filterOptions.map((option) =>
                    option.isDivider ? (
                      <Divider key={option.value} component="li" />
                    ) : option.isAllOption ? (
                      <SelectOption key={option.value} value={option.value}>
                        {option.label}
                      </SelectOption>
                    ) : (
                      <SelectOption
                        key={option.value}
                        value={option.value}
                        hasCheckbox
                        isSelected={selectedFilters.includes(option.value)}
                      >
                        {option.label}
                      </SelectOption>
                    )
                  )}
                </SelectList>
              </Select>
            </ToolbarItem>
            {selectedFilters.length > 0 && (
              <Button
                variant={ButtonVariant.link}
                onClick={clearFilters}
                className="odf-silenced-alerts__clear-filters"
              >
                {t('Clear filters')}
              </Button>
            )}
          </div>
          <ToolbarItem>
            <SearchInput
              aria-label={t('Find by name')}
              placeholder={t('Find by name')}
              value={nameFilter}
              onChange={(_event, value) => setNameFilter(value)}
              onClear={() => setNameFilter('')}
            />
          </ToolbarItem>
          <ToolbarItem>
            <Button
              variant={ButtonVariant.primary}
              onClick={onUnsilence}
              isDisabled={isUnsilenceDisabled}
              isLoading={isUnsilencing}
            >
              {t('Unsilence')}
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      {actionError && (
        <Alert
          isInline
          variant={AlertVariant.danger}
          title={t('Unable to unsilence the selected alerts')}
          className="pf-v6-u-mb-md"
        >
          {actionError?.message}
        </Alert>
      )}
      <SelectableTable
        rows={filteredAlerts}
        columns={columns}
        RowComponent={RowRenderer}
        selectedRows={selectedAlerts}
        setSelectedRows={setSelectedAlerts}
        loaded={loaded}
        loadError={error}
        initialSortColumnIndex={0}
        borders={true}
        variant={TableVariant.DEFAULT}
      />
    </>
  );
};
