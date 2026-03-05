import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import {
  useODFSystemFlagsSelector,
  useODFNamespaceSelector,
} from '@odf/core/redux';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { useAlertManagerBasePath } from '@odf/shared/hooks/custom-prometheus-poll';
import { StorageClusterModel } from '@odf/shared/models';
import { StorageClusterKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
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

  // Fetch StorageCluster for indefinite silences (excludedAlerts)
  const { odfNamespace } = useODFNamespaceSelector();
  const { systemFlags, areFlagsSafe } = useODFSystemFlagsSelector();

  const storageClusterName = React.useMemo(() => {
    if (!areFlagsSafe || !odfNamespace) return undefined;
    return systemFlags[odfNamespace]?.ocsClusterName;
  }, [systemFlags, areFlagsSafe, odfNamespace]);

  // Watch StorageCluster to get real-time updates when excludedAlerts change
  // useMemo ensures stable function reference that updates when storageClusterName changes
  const storageClusterResource = React.useMemo(
    () => (ns: string) => ({
      kind: referenceForModel(StorageClusterModel),
      namespace: ns,
      name: storageClusterName,
      isList: false,
    }),
    [storageClusterName]
  );

  const [storageCluster, storageClusterLoaded, storageClusterError] =
    useSafeK8sWatchResource<StorageClusterKind>(storageClusterResource);

  const [healthAlerts, healthAlertsLoaded, healthAlertsError] =
    useHealthAlerts();
  const {
    silencedAlerts,
    silencedAlertsLoaded,
    silencedAlertsError,
    refreshSilencedAlerts,
    silences,
    excludedAlerts,
  } = useSilencedAlerts(storageCluster);
  const alertManagerBasePath = useAlertManagerBasePath();

  // Filter out silenced alerts from the active alerts list
  const activeAlerts = React.useMemo(
    () => filterOutSilencedAlerts(healthAlerts, silences, excludedAlerts),
    [healthAlerts, silences, excludedAlerts]
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
        title={t('Infrastructure health')}
        hasUnderline={false}
        breadcrumbs={[
          { name: t('Overview'), path: '/odf/overview' },
          {
            name: t('Infrastructure health'),
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
            loaded={silencedAlertsLoaded && storageClusterLoaded}
            error={silencedAlertsError || storageClusterError}
            alertManagerBasePath={alertManagerBasePath}
            onRefresh={refreshSilencedAlerts}
            storageCluster={storageCluster}
          />
        )}
      </ListPageBody>
      <SilenceAlertModal
        isOpen={isSilenceModalOpen}
        onClose={handleSilenceModalClose}
        selectedAlerts={alertsToSilence}
        alertManagerBasePath={alertManagerBasePath}
        onSuccess={handleSilenceSuccess}
        storageCluster={storageCluster}
        storageClusterLoaded={storageClusterLoaded}
      />
    </>
  );
};

export default HealthOverview;
