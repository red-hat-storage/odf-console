import * as React from 'react';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';

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
      />
    </ToggleGroup>
  );
};

const HealthOverview: React.FC = () => {
  const [selectedTab, setSelectedTab] = React.useState(
    HealthOverviewTab.ACTIVE_ALERTS
  );
  const { t } = useCustomTranslation();
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
      <div className="odf-m-pane__body">
        <HealthOverviewToggleGroup
          activeAlertsCount={10}
          silencedAlertsCount={20}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />
      </div>
    </>
  );
};

export default HealthOverview;
