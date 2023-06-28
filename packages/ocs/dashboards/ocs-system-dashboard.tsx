// Disabling as default imports from multiple files have same names
/* eslint-disable import/no-named-default */
/**
 * Dashboard that is injected to ODF Extension Point
 * TODO(bipuladh) Add this to ODF Extension Point once it's ready
 */

import * as React from 'react';
import {
  OCS_INDEPENDENT_FLAG,
  MCG_FLAG,
  CEPH_FLAG,
  OCS_NFS_ENABLED,
} from '@odf/core/features';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import {
  Overview,
  OverviewGrid,
  OverviewGridCard,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { RouteComponentProps } from 'react-router-dom';
import { StatusCard as NFSStatusCard } from './network-file-system/status-card/status-card';
import { ThroughputCard } from './network-file-system/throughput-card/throughput-card';
import { TopClientsCard } from './network-file-system/top-clients-card/top-clients-card';
import { default as ObjectActivityCard } from './object-service/activity-card/activity-card';
import { BucketsCard } from './object-service/buckets-card/buckets-card';
import { default as ObjectBreakdownCard } from './object-service/capacity-breakdown/capacity-breakdown-card';
import DataConsumptionCard from './object-service/data-consumption-card/data-consumption-card';
import { DetailsCard as ObjectDetailsCard } from './object-service/details-card/details-card';
import { ResourceProvidersCard } from './object-service/resource-providers-card/resource-providers-card';
import { default as ObjectStatusCard } from './object-service/status-card/status-card';
import StorageEfficiencyCard from './object-service/storage-efficiency-card/storage-efficiency-card';
import { default as ExtBreakdownCard } from './persistent-external/breakdown-card';
import { default as ExtDetailsCard } from './persistent-external/details-card';
import { StatusCard as ExtStatusCard } from './persistent-external/status-card';
import { default as ExtUtilizationCard } from './persistent-external/utilization-card';
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

export const BLOCK_FILE = 'block-file';
export const OBJECT = 'object';
export const NFS = 'network-file-system';

type CommonDashboardRendererProps = {
  leftCards?: React.ComponentType[];
  rightCards?: React.ComponentType[];
  mainCards: React.ComponentType[];
};

export const CommonDashboardRenderer: React.FC<CommonDashboardRendererProps> =
  ({ leftCards, rightCards, mainCards }) => {
    const mainGridCards: OverviewGridCard[] = mainCards.map(convertToCard);
    const leftGridCards: OverviewGridCard[] = leftCards?.map(convertToCard);
    const rightGridCards: OverviewGridCard[] = rightCards?.map(convertToCard);

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

const PersistentExternalDashboard: React.FC = () => {
  const mainCards: React.ComponentType[] = [
    ExtStatusCard,
    ExtBreakdownCard,
    ExtUtilizationCard,
  ];
  const leftCards: React.ComponentType[] = [ExtDetailsCard, InventoryCard];
  const rightCards: React.ComponentType[] = [ActivityCard];

  return (
    <CommonDashboardRenderer
      leftCards={leftCards}
      mainCards={mainCards}
      rightCards={rightCards}
    />
  );
};

const ObjectServiceDashboard: React.FC = () => {
  const mainCards: React.ComponentType[] = [
    ObjectStatusCard,
    ObjectBreakdownCard,
    DataConsumptionCard,
  ];
  const leftCards: React.ComponentType[] = [
    ObjectDetailsCard,
    StorageEfficiencyCard,
    BucketsCard,
    ResourceProvidersCard,
  ];
  const rightCards: React.ComponentType[] = [ObjectActivityCard];
  return (
    <CommonDashboardRenderer
      leftCards={leftCards}
      mainCards={mainCards}
      rightCards={rightCards}
    />
  );
};

const NFSDashboard: React.FC = () => {
  const mainCards: React.ComponentType[] = [
    NFSStatusCard,
    ThroughputCard,
    TopClientsCard,
  ];
  return <CommonDashboardRenderer mainCards={mainCards} />;
};

const internalPage = (t: TFunction): TabPage => {
  return {
    href: BLOCK_FILE,
    title: t('Block and File'),
    component: PersistentInternalDashboard,
  };
};

const externalPage = (t: TFunction): TabPage => {
  return {
    href: BLOCK_FILE,
    title: t('Block and File'),
    component: PersistentExternalDashboard,
  };
};

const objectPage = (t: TFunction): TabPage => {
  return {
    href: OBJECT,
    title: t('Object'),
    component: ObjectServiceDashboard,
  };
};

const nfsPage = (t: TFunction): TabPage => {
  return {
    href: NFS,
    title: t('Network file system'),
    component: NFSDashboard,
  };
};

const OCSSystemDashboard: React.FC<RouteComponentProps> = () => {
  const { t } = useCustomTranslation();

  const isIndependent = useFlag(OCS_INDEPENDENT_FLAG);
  const isObjectServiceAvailable = useFlag(MCG_FLAG);
  const isCephAvailable = useFlag(CEPH_FLAG);
  const isNFSEnabled = useFlag(OCS_NFS_ENABLED);

  const showInternalDashboard = !isIndependent && isCephAvailable;
  const showNFSDashboard = !isIndependent && isNFSEnabled;

  const pages = React.useMemo(() => {
    const tempPages = [];
    showInternalDashboard && tempPages.push(internalPage(t));
    isIndependent && tempPages.push(externalPage(t));
    showNFSDashboard && tempPages.push(nfsPage(t));
    isObjectServiceAvailable && tempPages.push(objectPage(t));
    return tempPages;
  }, [
    showInternalDashboard,
    isIndependent,
    showNFSDashboard,
    isObjectServiceAvailable,
    t,
  ]);

  return pages.length > 0 ? (
    <Tabs id="odf-dashboard-tab" tabs={pages} basePath="overview" />
  ) : (
    <LoadingBox />
  );
};

export default OCSSystemDashboard;
