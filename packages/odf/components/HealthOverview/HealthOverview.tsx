import * as React from 'react';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { useAlertManagerBasePath } from '@odf/shared/hooks/custom-prometheus-poll';
import { ListPageBody } from '@openshift-console/dynamic-plugin-sdk';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { FilterableAlertsTable } from './FilterableAlertsTable';
import {
  useHealthAlerts,
  useSilencedAlerts,
  AlertRowData,
  filterOutSilencedAlerts,
} from './hooks';
import InfraHealthGraph from './InfraHealthGraph';
import { SilenceAlertModal } from './SilenceAlertModal';
import { SilencedAlertsTable } from './SilencedAlertsTable';

enum HealthOverviewTab {
  SILENCED_ALERTS,
  LAST_24_HOURS_ALERTS,
}

type HealthOverviewToggleGroupProps = {
  selectedTab: HealthOverviewTab;
  setSelectedTab: (tab: HealthOverviewTab) => void;
  activeAlertsCount: number;
  silencedAlertsCount: number;
};

const HealthOverviewToggleGroup: React.FC<HealthOverviewToggleGroupProps> = ({
  selectedTab,
  setSelectedTab,
  activeAlertsCount,
  silencedAlertsCount,
}) => {
  const { t } = useCustomTranslation();
  return (
    <ToggleGroup>
      <ToggleGroupItem
        value={HealthOverviewTab.LAST_24_HOURS_ALERTS}
        isSelected={selectedTab === HealthOverviewTab.LAST_24_HOURS_ALERTS}
        onChange={() => setSelectedTab(HealthOverviewTab.LAST_24_HOURS_ALERTS)}
        text={t('Last 24 hours ({{count}})', { count: activeAlertsCount })}
      />
      <ToggleGroupItem
        value={HealthOverviewTab.SILENCED_ALERTS}
        isSelected={selectedTab === HealthOverviewTab.SILENCED_ALERTS}
        onChange={() => setSelectedTab(HealthOverviewTab.SILENCED_ALERTS)}
        text={t('Silenced Alerts ({{count}})', { count: silencedAlertsCount })}
        isDisabled={silencedAlertsCount === 0}
      />
    </ToggleGroup>
  );
};

const HealthOverview: React.FC = () => {
  const [selectedTab, setSelectedTab] = React.useState(
    HealthOverviewTab.LAST_24_HOURS_ALERTS
  );
  const { t } = useCustomTranslation();

  const [healthAlerts, healthAlertsLoaded, healthAlertsError] =
    useHealthAlerts();
  const {
    silencedAlerts,
    silencedAlertsLoaded,
    silencedAlertsError,
    refreshSilencedAlerts,
    silences,
  } = useSilencedAlerts();
  const alertManagerBasePath = useAlertManagerBasePath();

  // Filter out silenced alerts from the active alerts list
  const activeAlerts = React.useMemo(
    () => filterOutSilencedAlerts(healthAlerts, silences),
    [healthAlerts, silences]
  );

  // Track filtered alerts from the FilterableAlertsTable
  const [filteredAlerts, setFilteredAlerts] =
    React.useState<AlertRowData[]>(activeAlerts);

  // Silence modal state
  const [isSilenceModalOpen, setIsSilenceModalOpen] = React.useState(false);
  const [alertsToSilence, setAlertsToSilence] = React.useState<AlertRowData[]>(
    []
  );

  const handleSilenceAlerts = (selectedAlerts: AlertRowData[]) => {
    setAlertsToSilence(selectedAlerts);
    setIsSilenceModalOpen(true);
  };

  const handleSilenceModalClose = () => {
    setIsSilenceModalOpen(false);
    setAlertsToSilence([]);
  };

  const handleSilenceSuccess = () => {
    // Refresh the silenced alerts data after successful silence
    // This will cause the active alerts to be re-filtered
    refreshSilencedAlerts();
  };

  const handleFilteredAlertsChange = (newFilteredAlerts: AlertRowData[]) => {
    setFilteredAlerts(newFilteredAlerts);
  };

  return (
    <>
      <PageHeading
        title={t('DF infrastructure health')}
        hasUnderline={false}
        breadcrumbs={[
          { name: t('Overview'), path: '/odf/overview' },
          {
            name: t('DF infrastructure health'),
            path: '/odf/overview/health',
          },
        ]}
      />
      <ListPageBody>
        <HealthOverviewToggleGroup
          activeAlertsCount={activeAlerts.length}
          silencedAlertsCount={silencedAlerts.length}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />
        {selectedTab === HealthOverviewTab.LAST_24_HOURS_ALERTS && (
          <>
            <InfraHealthGraph
              alerts={filteredAlerts}
              alertsLoaded={healthAlertsLoaded}
              alertsError={healthAlertsError}
            />
            <FilterableAlertsTable
              alerts={activeAlerts}
              loaded={healthAlertsLoaded}
              error={healthAlertsError}
              onSilenceClick={handleSilenceAlerts}
              onFilteredAlertsChange={handleFilteredAlertsChange}
            />
          </>
        )}
        {selectedTab === HealthOverviewTab.SILENCED_ALERTS && (
          <SilencedAlertsTable
            alerts={silencedAlerts}
            loaded={silencedAlertsLoaded}
            error={silencedAlertsError}
            alertManagerBasePath={alertManagerBasePath}
            onRefresh={refreshSilencedAlerts}
          />
        )}
      </ListPageBody>
      <SilenceAlertModal
        isOpen={isSilenceModalOpen}
        onClose={handleSilenceModalClose}
        selectedAlerts={alertsToSilence}
        alertManagerBasePath={alertManagerBasePath}
        onSuccess={handleSilenceSuccess}
      />
    </>
  );
};

export default HealthOverview;
