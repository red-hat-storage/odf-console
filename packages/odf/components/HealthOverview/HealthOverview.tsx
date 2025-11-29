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
import { SilenceAlertModal } from './SilenceAlertModal';
import { SilencedAlertsTable } from './SilencedAlertsTable';

enum HealthOverviewTab {
  SILENCED_ALERTS,
  ACTIVE_ALERTS,
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
        value={HealthOverviewTab.ACTIVE_ALERTS}
        isSelected={selectedTab === HealthOverviewTab.ACTIVE_ALERTS}
        onChange={() => setSelectedTab(HealthOverviewTab.ACTIVE_ALERTS)}
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
    HealthOverviewTab.ACTIVE_ALERTS
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

  // Silence modal state
  const [isSilenceModalOpen, setIsSilenceModalOpen] = React.useState(false);
  const [alertsToSilence, setAlertsToSilence] = React.useState<AlertRowData[]>(
    []
  );

  const handleSilenceAlerts = React.useCallback(
    (selectedAlerts: AlertRowData[]) => {
      setAlertsToSilence(selectedAlerts);
      setIsSilenceModalOpen(true);
    },
    []
  );

  const handleSilenceModalClose = React.useCallback(() => {
    setIsSilenceModalOpen(false);
    setAlertsToSilence([]);
  }, []);

  const handleSilenceSuccess = React.useCallback(() => {
    // Refresh the silenced alerts data after successful silence
    // This will cause the active alerts to be re-filtered
    refreshSilencedAlerts();
  }, [refreshSilencedAlerts]);

  return (
    <>
      <PageHeading
        title={t('ODF infrastructure health')}
        hasUnderline={false}
        breadcrumbs={[
          { name: t('Overview'), path: '/odf/overview' },
          {
            name: t('ODF infrastructure health'),
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
        {selectedTab === HealthOverviewTab.ACTIVE_ALERTS && (
          <FilterableAlertsTable
            alerts={activeAlerts}
            loaded={healthAlertsLoaded}
            error={healthAlertsError}
            onSilenceClick={handleSilenceAlerts}
          />
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
