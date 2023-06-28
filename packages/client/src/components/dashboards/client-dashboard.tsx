import * as React from 'react';
import { CommonDashboardRenderer } from '@odf/ocs/dashboards/ocs-system-dashboard';
import BreakdownCard from '@odf/ocs/dashboards/persistent-external/breakdown-card';
import UtilizationCard from '@odf/ocs/dashboards/persistent-external/utilization-card';
import PageHeading from '@odf/shared/heading/page-heading';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs from '@odf/shared/utils/Tabs';
import { ActivityCard, DetailsCard, StatusCard, InventoryCard } from './cards';

const PersistentClientDashboard: React.FC = () => {
  const mainCards: React.ComponentType[] = [
    StatusCard,
    BreakdownCard,
    UtilizationCard,
  ];
  const leftCards: React.ComponentType[] = [DetailsCard, InventoryCard];
  const rightCards: React.ComponentType[] = [ActivityCard];
  return (
    <CommonDashboardRenderer
      leftCards={leftCards}
      mainCards={mainCards}
      rightCards={rightCards}
    />
  );
};

const StorageClientDashboard: React.FC = () => {
  const { t } = useCustomTranslation();

  const pages = [
    {
      href: '/',
      title: t('Overview'),
      component: PersistentClientDashboard,
    },
  ];

  return (
    <>
      <PageHeading title={t('Data Foundation')} />
      <Tabs id="odf-dashboard-tab" tabs={pages} basePath="overview" />
    </>
  );
};

export default StorageClientDashboard;
