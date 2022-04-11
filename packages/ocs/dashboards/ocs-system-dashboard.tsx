// Disabling as default imports from multiple files have same names
/* eslint-disable import/no-named-default */
/**
 * Dashboard that is injected to ODF Extension Point
 * TODO(bipuladh) Add this to ODF Extension Point once it's ready
 */

import * as React from 'react';
import { LoadingBox } from '@odf/shared/generic/status-box';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import {
  Overview,
  OverviewGrid,
  OverviewGridCard,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps } from 'react-router-dom';
import { default as ActivityCard } from './persistent-internal/activity-card/activity-card';
import BreakdownCard from './persistent-internal/capacity-breakdown-card/capacity-breakdown-card';
import DetailsCard from './persistent-internal/details-card';
import InventoryCard from './persistent-internal/inventory-card';
import RawCapacityCard from './persistent-internal/raw-capacity-card/raw-capacity-card';
import { default as StatusCard } from './persistent-internal/status-card/status-card';
import storageEfficiencyCard from './persistent-internal/storage-efficiency-card/storage-efficiency-card';
import UtilizationCard from './persistent-internal/utilization-card/utilization-card';

const convertToCard = (Card: React.ComponentType): OverviewGridCard => ({
  Card,
});

const isPagePresent = (pages: TabPage[], page: TabPage): boolean =>
  pages.some((p) => page.href === p.href);

const sortPages = (a: TabPage, b: TabPage): number => {
  if (a.href === BLOCK_FILE || a.href === `overview/${BLOCK_FILE}`) return -1;
  if (b.href === OBJECT || a.href === `overview/${OBJECT}`) return 1;
  return 0;
};

export const BLOCK_FILE = 'block-file';
export const OBJECT = 'object';

type CommonDashboardRendererProps = {
  leftCards: React.ComponentType[];
  rightCards: React.ComponentType[];
  mainCards: React.ComponentType[];
};

const CommonDashboardRenderer: React.FC<CommonDashboardRendererProps> = ({
  leftCards,
  rightCards,
  mainCards,
}) => {
  const mainGridCards: OverviewGridCard[] = mainCards.map(convertToCard);
  const leftGridCards: OverviewGridCard[] = leftCards.map(convertToCard);
  const rightGridCards: OverviewGridCard[] = rightCards.map(convertToCard);

  return (
    <Overview>
      <OverviewGrid
        mainCards={mainGridCards}
        leftCards={leftGridCards}
        rightCards={rightGridCards}
      />
    </Overview>
  );
};

const PersistentInternalDashboard: React.FC = () => {
  const mainCards: React.ComponentType[] = [
    StatusCard,
    RawCapacityCard,
    BreakdownCard,
    UtilizationCard,
  ];
  const leftCards: React.ComponentType[] = [
    DetailsCard,
    InventoryCard,
    storageEfficiencyCard,
  ];
  const rightCards: React.ComponentType[] = [ActivityCard];

  return (
    <CommonDashboardRenderer
      leftCards={leftCards}
      mainCards={mainCards}
      rightCards={rightCards}
    />
  );
};

export const OCS_INDEPENDENT_FLAG = 'OCS_INDEPENDENT';
export const MCG_FLAG = 'MCG';
// Based on the existence of CephCluster
export const CEPH_FLAG = 'CEPH';

const OCSSystemDashboard: React.FC<RouteComponentProps> = () => {
  const { t } = useTranslation();

  const isIndependent = useFlag(OCS_INDEPENDENT_FLAG);
  const isCephAvailable = useFlag(CEPH_FLAG);

  const [pages, setPages] = React.useState<TabPage[]>([]);

  const internalPage = React.useMemo(
    () => ({
      href: BLOCK_FILE,
      title: t('Block and File'),
      component: PersistentInternalDashboard,
    }),
    [t]
  );

  const showInternalDashboard = !isIndependent && isCephAvailable;

  React.useEffect(() => {
    if (showInternalDashboard && !isPagePresent(pages, internalPage)) {
      const tempPages = [...pages, internalPage];
      const sortedPages = tempPages.sort(sortPages);
      setPages(sortedPages);
    }
  }, [internalPage, pages, showInternalDashboard]);

  return pages.length > 0 ? (
    <Tabs id="odf-dashboard-tab" tabs={pages} />
  ) : (
    <LoadingBox />
  );
};

export default OCSSystemDashboard;
