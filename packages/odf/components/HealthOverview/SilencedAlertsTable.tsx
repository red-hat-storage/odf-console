import * as React from 'react';
import { DASH, getAlertManagerSilenceEndpoint } from '@odf/shared';
import { dateTimeFormatter } from '@odf/shared/details-page/datetime';
import {
  SelectableTable,
  TableColumnProps,
  RowComponentType,
  TableVariant,
} from '@odf/shared/table';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { fuzzyCaseInsensitive } from '@odf/shared/utils';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
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
import { SilencedAlertRowData } from './hooks';
import { getSeverityIcon, SEVERITY_MAP } from './utils';

type SilencedAlertsTableProps = {
  alerts: SilencedAlertRowData[];
  loaded: boolean;
  error?: any;
  alertManagerBasePath: string;
  onRefresh: () => void;
};

const RowRenderer: React.FC<RowComponentType<SilencedAlertRowData>> = ({
  row,
}) => {
  const { t } = useCustomTranslation();
  const silencedOnDisplay = row.silencedOn
    ? dateTimeFormatter.format(row.silencedOn)
    : DASH;
  const untilDisplay = row.endsOn ? dateTimeFormatter.format(row.endsOn) : DASH;

  return (
    <>
      <Td dataLabel={t('Silenced on')}>
        <div>{silencedOnDisplay}</div>
        <div className="pf-v6-u-color-200">
          {row.endsOn ? t('Until {{time}}', { time: untilDisplay }) : DASH}
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

export const SilencedAlertsTable: React.FC<SilencedAlertsTableProps> = ({
  alerts,
  loaded,
  error,
  alertManagerBasePath,
  onRefresh,
}) => {
  const { t } = useCustomTranslation();
  const [selectedAlerts, setSelectedAlerts] = React.useState<
    SilencedAlertRowData[]
  >([]);
  const [nameFilter, setNameFilter] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState('all');
  const [isSeverityOpen, setIsSeverityOpen] = React.useState(false);
  const [isUnsilencing, setIsUnsilencing] = React.useState(false);
  const [actionError, setActionError] = React.useState<any>();

  const severityOptions = React.useMemo(
    () => [
      { value: 'all', label: t('All checks') },
      { value: 'critical', label: t('Critical') },
      { value: 'moderate', label: t('Moderate') },
      { value: 'minor', label: t('Minor') },
    ],
    [t]
  );

  const filteredAlerts = React.useMemo(
    () =>
      alerts.filter((alert) => {
        // Filter by severity using the SEVERITY_MAP
        let severityMatch = true;
        if (severityFilter !== 'all') {
          const targetSeverity = SEVERITY_MAP[severityFilter];
          if (targetSeverity) {
            severityMatch =
              alert.severity.toLowerCase() === targetSeverity.toLowerCase();
          }
        }

        const nameMatch =
          !nameFilter.trim() ||
          fuzzyCaseInsensitive(nameFilter, alert.alertname) ||
          fuzzyCaseInsensitive(nameFilter, alert.details);
        return severityMatch && nameMatch;
      }),
    [alerts, severityFilter, nameFilter]
  );

  const onSeveritySelect = React.useCallback((_event, selection: string) => {
    setSeverityFilter(selection);
    setIsSeverityOpen(false);
  }, []);

  const onUnsilence = async () => {
    if (!alertManagerBasePath) {
      return;
    }
    setIsUnsilencing(true);
    setActionError(undefined);
    try {
      await Promise.all(
        selectedAlerts.map((alert) =>
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

  const isUnsilenceDisabled =
    !selectedAlerts.length || !alertManagerBasePath || isUnsilencing;

  const renderSeverityToggle = React.useCallback(
    (toggleRef: React.Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={() => setIsSeverityOpen((prev) => !prev)}
        isExpanded={isSeverityOpen}
      >
        {severityOptions.find((opt) => opt.value === severityFilter)?.label ||
          t('All checks')}
      </MenuToggle>
    ),
    [severityFilter, isSeverityOpen, severityOptions, t]
  );

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Select
              aria-label={t('Filter by severity')}
              isOpen={isSeverityOpen}
              toggle={renderSeverityToggle}
              onOpenChange={setIsSeverityOpen}
              onSelect={onSeveritySelect}
              selected={severityFilter}
              shouldFocusFirstItemOnOpen
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {severityOptions.map((option) => (
                  <SelectOption key={option.value} value={option.value}>
                    {option.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </ToolbarItem>
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
