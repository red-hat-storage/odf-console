/**
 * Add components specific to appicaltion-wise card here
 */

import * as React from 'react';
import { ReplicationType } from '@odf/mco/constants';
import { PlacementControlInfo, ProtectedAppsMap, Phase } from '@odf/mco/types';
import { getDRStatus } from '@odf/mco/utils';
import { formatTime } from '@odf/shared/details-page/datetime';
import { fromNow } from '@odf/shared/details-page/datetime';
import { useScheduler } from '@odf/shared/hooks';
import { GrayUnknownIcon, GreenCheckCircleIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getPageRange } from '@odf/shared/utils';
import {
  PrometheusResponse,
  RowProps,
  StatusIconAndText,
  TableColumn,
  TableData,
  VirtualizedTable,
  useActiveColumns,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  Pagination,
  PaginationVariant,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { InProgressIcon, PendingIcon } from '@patternfly/react-icons';
import { sortable } from '@patternfly/react-table';
import { StatusText } from './common';

const INITIAL_PAGE_NUMBER = 1;
const COUNT_PER_PAGE_NUMBER = 5;

const subscriptionTableColumnProps = [
  {
    id: 'name',
  },
  {
    id: 'activity',
  },
  {
    id: 'lastSnapshotSyncTime',
  },
];

const formatSyncTimeWithRPO = (lastSnapshotSyncTime: string, rpo: string) => {
  const dateTime = formatTime(lastSnapshotSyncTime);
  return `${dateTime} (${rpo})`;
};

export const getCurrentActivity = (
  currentStatus: string,
  failoverCluster: string,
  preferredCluster: string,
  t: TFunction,
  isCleanupPending?: boolean,
  replicationType?: ReplicationType
): { description: string; status: string; icon: JSX.Element } => {
  const status = currentStatus as Phase;

  switch (status) {
    case Phase.Relocating:
      return isCleanupPending
        ? {
            description: t(
              'Clean up application resources on current primary cluster {{ failoverCluster }} to start the relocation.',
              { failoverCluster }
            ),
            status: t('Cleanup Pending'),
            icon: <PendingIcon />,
          }
        : {
            description: t('Relocating to cluster {{ preferredCluster }}', {
              preferredCluster,
            }),
            status: t('In Progress'),
            icon: <InProgressIcon />,
          };

    case Phase.Relocated:
      return {
        description: t('Relocated to cluster {{ preferredCluster }}', {
          preferredCluster,
        }),
        status: t('Completed'),
        icon: <GreenCheckCircleIcon />,
      };

    case Phase.FailingOver:
      return {
        description: t('FailingOver to cluster {{ failoverCluster }}', {
          failoverCluster,
        }),
        status: t('In Progress'),
        icon: <InProgressIcon />,
      };

    case Phase.FailedOver:
      if (isCleanupPending) {
        return replicationType === ReplicationType.ASYNC
          ? {
              description: t(
                'Clean up application resources on failed cluster {{ preferredCluster }} to start the replication.',
                { preferredCluster }
              ),
              status: t('Pending'),
              icon: <PendingIcon />,
            }
          : {
              description: t(
                'Clean up application resources on failed cluster {{ preferredCluster }}.',
                { preferredCluster }
              ),
              status: t('Pending'),
              icon: <PendingIcon />,
            };
      } else {
        return {
          description: t('FailedOver to cluster {{ failoverCluster }}', {
            failoverCluster,
          }),
          status: t('Completed'),
          icon: <GreenCheckCircleIcon />,
        };
      }

    default:
      return {
        description: t('Unknown'),
        status: t('Unknown'),
        icon: <GrayUnknownIcon />,
      };
  }
};

const getSubscriptionRow = (
  placementControlInfoList: PlacementControlInfo[] = []
): SubscriptionRowProps[] => {
  const getRowProps = (
    subscriptions: string[],
    {
      status,
      lastVolumeGroupSyncTime,
      failoverCluster,
      preferredCluster,
    }: PlacementControlInfo
  ): SubscriptionRowProps[] =>
    subscriptions?.map((subscriptionName) => ({
      name: subscriptionName,
      activity: status,
      lastSnapshotSyncTime: lastVolumeGroupSyncTime,
      failoverCluster: failoverCluster,
      preferredCluster: preferredCluster,
    }));
  return placementControlInfoList.reduce(
    (acc, placementControlInfo) => [
      ...acc,
      ...getRowProps(placementControlInfo?.subscriptions, placementControlInfo),
    ],
    []
  );
};

export const ActivitySection: React.FC<CommonProps> = ({
  selectedApplication,
}) => {
  const { t } = useCustomTranslation();

  const placementControlInfo: PlacementControlInfo =
    selectedApplication?.placementControlInfo?.[0];
  const currentStatus = placementControlInfo?.status;
  const failoverCluster = placementControlInfo?.failoverCluster;
  const preferredCluster = placementControlInfo?.preferredCluster;
  return (
    <div className="mco-dashboard__contentColumn">
      <StatusText>{t('Activity')}</StatusText>
      <StatusIconAndText
        icon={getDRStatus({ currentStatus, t }).icon}
        title={
          getCurrentActivity(
            currentStatus,
            failoverCluster,
            preferredCluster,
            t
          ).description
        }
        className="text-muted"
      />
    </div>
  );
};

export const NamespaceSection: React.FC<CommonProps> = ({
  selectedApplication,
}) => {
  const { t } = useCustomTranslation();
  const workloadNamespace =
    selectedApplication?.placementControlInfo?.[0]?.workloadNamespaces;

  return (
    <div className="mco-dashboard__contentColumn">
      <Content component={ContentVariants.h1}>
        {workloadNamespace.length}
      </Content>
      <StatusText>{t('Namespaces')}</StatusText>
    </div>
  );
};

export const SnapshotSection: React.FC<SnapshotSectionProps> = ({
  selectedApplication,
  isVolumeSnapshot,
}) => {
  const { t } = useCustomTranslation();
  const [syncTime, setSyncTime] = React.useState('N/A');
  const lastSyncTime = isVolumeSnapshot
    ? selectedApplication?.placementControlInfo?.[0]?.lastVolumeGroupSyncTime
    : selectedApplication?.placementControlInfo?.[0]
        ?.kubeObjectLastProtectionTime;

  const updateSyncTime = React.useCallback(() => {
    setSyncTime(
      !!lastSyncTime
        ? formatSyncTimeWithRPO(lastSyncTime, fromNow(lastSyncTime))
        : 'N/A'
    );
  }, [lastSyncTime]);

  useScheduler(updateSyncTime);

  const title = isVolumeSnapshot
    ? t('Volume snapshot')
    : t('Kubernetes object snapshot');

  return (
    <div className="mco-dashboard__contentColumn">
      <StatusText>{title}</StatusText>
      <Content component="p" className="text-muted">
        {t('Last on: {{ syncTime }}', {
          syncTime: syncTime,
        })}
      </Content>
    </div>
  );
};

const SubscriptionRow: React.FC<
  RowProps<SubscriptionRowProps, SubscriptionWiseRPOMap>
> = ({
  obj: {
    name,
    activity,
    lastSnapshotSyncTime,
    failoverCluster,
    preferredCluster,
  },
  rowData: subsWiseRPO,
  activeColumnIDs,
}) => {
  const { t } = useCustomTranslation();
  const lastSyncTimeWithRPO = !!lastSnapshotSyncTime
    ? formatSyncTimeWithRPO(lastSnapshotSyncTime, subsWiseRPO[name])
    : 'N/A';

  return (
    <>
      <TableData
        {...subscriptionTableColumnProps[0]}
        activeColumnIDs={activeColumnIDs}
      >
        {name}
      </TableData>
      <TableData
        {...subscriptionTableColumnProps[1]}
        activeColumnIDs={activeColumnIDs}
      >
        {
          getCurrentActivity(activity, failoverCluster, preferredCluster, t)
            .description
        }
      </TableData>
      <TableData
        {...subscriptionTableColumnProps[2]}
        activeColumnIDs={activeColumnIDs}
      >
        {lastSyncTimeWithRPO}
      </TableData>
    </>
  );
};

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  selectedApplication,
}) => {
  const { t } = useCustomTranslation();
  const subsCount = selectedApplication?.placementControlInfo?.reduce(
    (acc, placement) => acc + placement.subscriptions?.length || 0,
    0
  );
  return (
    <div className="mco-dashboard__contentColumn">
      <Content component={ContentVariants.h1}>{subsCount}</Content>
      <StatusText>{t('Subscription')}</StatusText>
    </div>
  );
};

export const SubscriptionDetailsTable: React.FC<
  SubscriptionDetailsTableProps
> = ({ selectedApplication }) => {
  const { placementControlInfo } = selectedApplication;
  const { t } = useCustomTranslation();
  const [subsWiseRPO, setSubsWiseRPO] = React.useState<SubscriptionWiseRPOMap>(
    {}
  );
  const [page, setPage] = React.useState(INITIAL_PAGE_NUMBER);
  const [perPage, setPerPage] = React.useState(COUNT_PER_PAGE_NUMBER);
  const subscriptionsTableColumns = React.useMemo<
    TableColumn<SubscriptionRowProps>[]
  >(
    () => [
      {
        title: t('Name'),
        sort: 'name',
        transforms: [sortable],
        id: subscriptionTableColumnProps[0].id,
      },
      {
        title: t('Activity'),
        sort: 'activity',
        transforms: [sortable],
        id: subscriptionTableColumnProps[1].id,
      },
      {
        title: t('Last snapshot synced'),
        sort: 'lastSnapshotSyncTime',
        transforms: [sortable],
        id: subscriptionTableColumnProps[2].id,
      },
    ],
    [t]
  );
  const [columns] = useActiveColumns({
    columns: subscriptionsTableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });
  const [subscriptionRows, numberOfRows]: [SubscriptionRowProps[], number] =
    React.useMemo(() => {
      const [start, end] = getPageRange(page, perPage);
      const subscriptionRowList = getSubscriptionRow(placementControlInfo);
      return [
        subscriptionRowList.slice(start, end),
        subscriptionRowList.length,
      ];
    }, [placementControlInfo, page, perPage]);
  const updatedRPO = React.useCallback(() => {
    const rpoMap = subscriptionRows.reduce((acc, row) => {
      const { name, lastSnapshotSyncTime } = row;
      acc[name] = !!lastSnapshotSyncTime ? fromNow(lastSnapshotSyncTime) : '';
      return acc;
    }, {});
    setSubsWiseRPO(rpoMap);
  }, [subscriptionRows, setSubsWiseRPO]);

  useScheduler(updatedRPO);

  return (
    <div className="mco-dashboard__contentColumn">
      <Content component={ContentVariants.h3}>
        {t('Subscription details')}
      </Content>
      <div className="mco-cluster-app__subs-table--width">
        <VirtualizedTable
          data={subscriptionRows}
          unfilteredData={subscriptionRows}
          aria-label={t('Subscription details')}
          columns={columns}
          Row={SubscriptionRow}
          rowData={subsWiseRPO}
          loaded={true}
          loadError=""
        />
        <Pagination
          itemCount={numberOfRows}
          widgetId="subscription-table"
          perPage={perPage}
          page={page}
          variant={PaginationVariant.bottom}
          perPageOptions={[]}
          isStatic
          onSetPage={(_event, newPage) => setPage(newPage)}
          onPerPageSelect={(_event, newPerPage, newPage) => {
            setPerPage(newPerPage);
            setPage(newPage);
          }}
        />
      </div>
    </div>
  );
};

type CommonProps = {
  selectedApplication: ProtectedAppsMap;
  lastSyncTimeData?: PrometheusResponse;
};

type SubscriptionSectionProps = {
  selectedApplication: ProtectedAppsMap;
};

type SubscriptionDetailsTableProps = {
  selectedApplication: ProtectedAppsMap;
};

type SubscriptionRowProps = {
  name: string;
  activity: string;
  lastSnapshotSyncTime: string;
  failoverCluster: string;
  preferredCluster: string;
};

type SubscriptionWiseRPOMap = {
  [subscriptionName: string]: string;
};

type SnapshotSectionProps = CommonProps & {
  isVolumeSnapshot?: boolean;
};
