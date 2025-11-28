import * as React from 'react';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { useAlertManagerBasePath } from '@odf/shared/hooks/custom-prometheus-poll';
import { ListPageBody } from '@openshift-console/dynamic-plugin-sdk';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { AlertsTable } from './AlertsTable';
import { useHealthAlerts, useSilencedAlerts } from './hooks';
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
  } = useSilencedAlerts();
  const alertManagerBasePath = useAlertManagerBasePath();

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
          activeAlertsCount={healthAlerts.length}
          silencedAlertsCount={silencedAlerts.length}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />
        {selectedTab === HealthOverviewTab.ACTIVE_ALERTS && (
          <AlertsTable
            alerts={healthAlerts}
            loaded={healthAlertsLoaded}
            error={healthAlertsError}
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
    </>
  );
};

export default HealthOverview;
