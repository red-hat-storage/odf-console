// Disabling as default imports from multiple files have same names
/* eslint-disable import/no-named-default */

import * as React from 'react';
import { ClientListPage } from '@odf/core/components/storage-consumers/client-list';
import TopologyWithErrorHandler from '@odf/core/components/topology/Topology';
import { FDF_FLAG, useODFSystemFlagsSelector } from '@odf/core/redux';
import {
  useGetExternalClusterDetails,
  useGetInternalClusterDetails,
} from '@odf/core/redux/utils';
import { PageHeading } from '@odf/shared';
import { LoadingBox } from '@odf/shared/generic/status-box';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import Tabs, { TabPage } from '@odf/shared/utils/Tabs';
import {
  Overview,
  OverviewGrid,
  OverviewGridCard,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import StoragePoolListPage from '../storage-pool/StoragePoolListPage';
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
import CapacityTrendCard from './persistent-internal/capacity-trend-card/capacity-trend-card';
import DetailsCard from './persistent-internal/details-card';
import InventoryCard from './persistent-internal/inventory-card';
import PoolUtilizationCard from './persistent-internal/pool-utilization-card/pool-utilization-card';
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

export const CommonDashboardRenderer: React.FC<
  CommonDashboardRendererProps
> = ({ leftCards, rightCards, mainCards }) => {
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
    CapacityTrendCard,
    BreakdownCard,
    PoolUtilizationCard,
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

const storagePoolHref = 'storage-pools';

const storagePoolPage = (t: TFunction): TabPage => {
  return {
    href: storagePoolHref,
    title: t('Storage pools'),
    component: StoragePoolListPage,
  };
};

const topologyPage = (t: TFunction): TabPage => {
  return {
    href: 'topology',
    title: t('Topology'),
    component: TopologyWithErrorHandler,
  };
};

const nfsPage = (t: TFunction): TabPage => {
  return {
    href: NFS,
    title: t('Network file system'),
    component: NFSDashboard,
  };
};

const clientsPage = (t: TFunction): TabPage => {
  return {
    href: 'clients',
    title: t('Clients'),
    component: ClientListPage,
  };
};

export const ExternalSystemDashboard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { systemName } = useParams();
  const pages = [externalPage(t), objectPage(t)];

  const breadcrumbs = [
    {
      name: t('External systems'),
      path: '/odf/external-systems',
    },
    {
      name: t('External system details'),
      path: '',
    },
  ];
  return (
    <>
      <PageHeading title={systemName} breadcrumbs={breadcrumbs} />
      <Tabs id="odf-dashboard-tab" tabs={pages} />;
    </>
  );
};

const OCSSystemDashboard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const { systemFlags } = useODFSystemFlagsSelector();
  const { clusterNamespace: clusterNs } = useGetInternalClusterDetails();

  const isMCGAvailable = systemFlags[clusterNs]?.isNoobaaAvailable;
  const isRGWAvailable = systemFlags[clusterNs]?.isRGWAvailable;
  const isObjectServiceAvailable = isMCGAvailable || isRGWAvailable;
  const isStorageClusterAvailable = systemFlags[clusterNs]?.ocsClusterName;
  const isNFSEnabled = systemFlags[clusterNs]?.isNFSEnabled;

  const showInternalDashboard = isStorageClusterAvailable;
  const showNFSDashboard = isNFSEnabled;
  const isFDF = useFlag(FDF_FLAG);

  const pages = React.useMemo(() => {
    const tempPages = [];
    showInternalDashboard && tempPages.push(internalPage(t));
    showNFSDashboard && tempPages.push(nfsPage(t));
    isObjectServiceAvailable && tempPages.push(objectPage(t));
    tempPages.push(storagePoolPage(t));
    tempPages.push(topologyPage(t));
    isFDF && tempPages.push(clientsPage(t));
    return tempPages;
  }, [
    showInternalDashboard,
    t,
    showNFSDashboard,
    isObjectServiceAvailable,
    isFDF,
  ]);

  return pages.length > 0 ? (
    <Tabs id="odf-dashboard-tab" tabs={pages} />
  ) : (
    <LoadingBox />
  );
};

export const ExternalStorageClusterDashboard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { systemName } = useParams();

  const { systemFlags } = useODFSystemFlagsSelector();
  const { clusterNamespace: clusterNs } = useGetExternalClusterDetails();

  const isMCGAvailable = systemFlags[clusterNs]?.isNoobaaAvailable;
  const isRGWAvailable = systemFlags[clusterNs]?.isRGWAvailable;
  const isObjectServiceAvailable = isMCGAvailable || isRGWAvailable;

  const pages = React.useMemo(() => {
    const tempPages = [];
    tempPages.push(externalPage(t));
    isObjectServiceAvailable && tempPages.push(objectPage(t));
    return tempPages;
  }, [t, isObjectServiceAvailable]);

  return pages.length > 0 ? (
    <>
      <PageHeading
        title={systemName}
        breadcrumbs={[
          {
            name: t('External systems'),
            path: '/odf/external-systems',
          },
          {
            name: systemName,
            path: '',
          },
        ]}
      />
      <Tabs id="odf-dashboard-tab" tabs={pages} />
    </>
  ) : (
    <LoadingBox />
  );
};

export default OCSSystemDashboard;
