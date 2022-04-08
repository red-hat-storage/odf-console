// Disabling as default imports from multiple files have same names
/* eslint-disable import/no-named-default */
/**
 * Dashboard that is injected to ODF Extension Point
 * TODO(bipuladh) Add this to ODF Extension Point once it's ready
 */

import * as React from 'react';
import {
  HorizontalNav,
  NavPage,
  Overview,
  OverviewGrid,
  OverviewGridCard,
  PageComponentProps,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { RouteComponentProps, useLocation } from 'react-router-dom';
import { default as ActivityCard } from './persistent-internal/activity-card/activity-card';
import BreakdownCard from './persistent-internal/capacity-breakdown-card/capacity-breakdown-card';
import DetailsCard from './persistent-internal/details-card';
import InventoryCard from './persistent-internal/inventory-card';
import RawCapacityCard from './persistent-internal/raw-capacity-card/raw-capacity-card';
import { default as StatusCard } from './persistent-internal/status-card/status-card';
import storageEfficiencyCard from './persistent-internal/storage-efficiency-card/storage-efficiency-card';
import UtilizationCard from './persistent-internal/utilization-card/utilization-card';

export type Page<D = any> = Partial<Omit<NavPage, 'component'>> & {
  component?: React.ComponentType<PageComponentProps & D>;
  badge?: React.ReactNode;
  pageData?: D;
  nameKey?: string;
};

const convertToCard = (Card: React.ComponentType): OverviewGridCard => ({
  Card,
});

const isPagePresent = (pages: Page[], page: Page): boolean =>
  pages.some((p) => page.href === p.href);

export const BLOCK_FILE = 'block-file';
export const OBJECT = 'object';

const sortPages = (a: Page, b: Page): number => {
  if (a.href === BLOCK_FILE || a.href === `overview/${BLOCK_FILE}`) return -1;
  if (b.href === OBJECT || a.href === `overview/${OBJECT}`) return 1;
  return 0;
};

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

const OCSSystemDashboard: React.FC<RouteComponentProps> = ({
  match,
  history,
}) => {
  const isIndependent = useFlag(OCS_INDEPENDENT_FLAG);
  const isObjectServiceAvailable = useFlag(MCG_FLAG);
  const isCephAvailable = useFlag(CEPH_FLAG);
  const [pages, setPages] = React.useState<Page[]>([]);
  const { t } = useTranslation();
  const location = useLocation();

  const showInternalDashboard = !isIndependent && isCephAvailable;

  const internalPage = React.useMemo(
    () => ({
      href: ``,
      name: t('Block and File'),
      component: PersistentInternalDashboard,
    }),
    [t]
  );

  React.useEffect(() => {
    if (showInternalDashboard && !isPagePresent(pages, internalPage)) {
      const tempPages = [...pages, internalPage];
      const sortedPages = tempPages.sort(sortPages);
      setPages(sortedPages);
    }
  }, [pages, showInternalDashboard, isIndependent, internalPage]);

  React.useEffect(() => {
    if (
      !location.pathname.includes(BLOCK_FILE) &&
      !location.pathname.includes(OBJECT)
    ) {
      if (isCephAvailable === true) {
        history.push(`${match.url}/${BLOCK_FILE}`);
      } else if (isCephAvailable === false && isObjectServiceAvailable) {
        history.push(`${match.url}/${OBJECT}`);
      }
    }
  }, [
    isCephAvailable,
    isObjectServiceAvailable,
    history,
    match.url,
    location.pathname,
  ]);

  return (
    <>
      <HorizontalNav pages={pages as any} />
    </>
  );
};

export default OCSSystemDashboard;
