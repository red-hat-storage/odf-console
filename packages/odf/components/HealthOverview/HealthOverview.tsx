import * as React from 'react';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import InfraHealthGraph from './InfraHealthGraph';

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
      />
    </ToggleGroup>
  );
};

const HealthOverview: React.FC = () => {
  const [selectedTab, setSelectedTab] = React.useState(
    HealthOverviewTab.LAST_24_HOURS_ALERTS
  );
  const { t } = useCustomTranslation();
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
      <div className="odf-m-pane__body">
        <HealthOverviewToggleGroup
          activeAlertsCount={10}
          silencedAlertsCount={20}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />
        {/* ToDo: Call "useHealthAlerts.ts" hook to get alerts data */}
        <InfraHealthGraph alerts={[]} alertsLoaded={true} alertsError={null} />
      </div>
    </>
  );
};

export default HealthOverview;
