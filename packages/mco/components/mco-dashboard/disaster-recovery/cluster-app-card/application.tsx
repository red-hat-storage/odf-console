/**
 * Add components specific to appicaltion-wise card here
 */

import * as React from 'react';
import { DRPC_STATUS } from '@odf/mco/constants';
import { PlacementInfo, ProtectedAppsMap } from '@odf/mco/types';
import { getDRStatus } from '@odf/mco/utils';
import { formatTime } from '@odf/shared/details-page/datetime';
import { fromNow } from '@odf/shared/details-page/datetime';
import { useScheduler } from '@odf/shared/hooks';
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
import { TFunction } from 'i18next';
import {
  Pagination,
  PaginationVariant,
  Text,
  TextVariants,
} from '@patternfly/react-core';
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
  t: TFunction
) => {
  if (
    [DRPC_STATUS.Relocating, DRPC_STATUS.Relocated].includes(
      currentStatus as DRPC_STATUS
    )
  ) {
    return t('{{ currentStatus }} to cluster {{ preferredCluster }}', {
      currentStatus,
      preferredCluster,
    });
  } else if (
    [DRPC_STATUS.FailingOver, DRPC_STATUS.FailedOver].includes(
      currentStatus as DRPC_STATUS
    )
  ) {
    return t('{{ currentStatus }} to cluster {{ failoverCluster }}', {
      currentStatus,
      failoverCluster,
    });
  } else {
    return t('Unknown');
  }
};

const getSubscriptionRow = (
  placementInfoList: PlacementInfo[] = []
): SubscriptionRowProps[] => {
  const _getRowProps = (
    subscriptions: string[],
    {
      status,
      lastGroupSyncTime,
      failoverCluster,
      preferredCluster,
    }: PlacementInfo
  ): SubscriptionRowProps[] =>
    subscriptions?.map((subscriptionName) => ({
      name: subscriptionName,
      activity: status,
      lastSnapshotSyncTime: lastGroupSyncTime,
      failoverCluster: failoverCluster,
      preferredCluster: preferredCluster,
    }));
  return placementInfoList.reduce(
    (acc, placementInfo) => [
      ...acc,
      ..._getRowProps(placementInfo?.subscriptions, placementInfo),
    ],
    []
  );
};

export const ActivitySection: React.FC<CommonProps> = ({
  selectedApplication,
}) => {
  const { t } = useCustomTranslation();

  const placementInfo: PlacementInfo = selectedApplication?.placementInfo?.[0];
  const currentStatus = placementInfo?.status;
  const failoverCluster = placementInfo?.failoverCluster;
  const preferredCluster = placementInfo?.preferredCluster;
  return (
    <div className="mco-dashboard__contentColumn">
      <StatusText>{t('Activity')}</StatusText>
      <StatusIconAndText
        icon={getDRStatus({ currentStatus, t }).icon}
        title={getCurrentActivity(
          currentStatus,
          failoverCluster,
          preferredCluster,
          t
        )}
        className="text-muted"
      />
    </div>
  );
};

export const SnapshotSection: React.FC<CommonProps> = ({
  selectedApplication,
}) => {
  const { t } = useCustomTranslation();
  const [lastSyncTime, setLastSyncTime] = React.useState('N/A');
  const lastGroupSyncTime =
    selectedApplication?.placementInfo?.[0]?.lastGroupSyncTime;
  const updateSyncTime = React.useCallback(() => {
    if (!!lastGroupSyncTime) {
      setLastSyncTime(
        formatSyncTimeWithRPO(lastGroupSyncTime, fromNow(lastGroupSyncTime))
      );
    } else {
      setLastSyncTime('N/A');
    }
  }, [lastGroupSyncTime]);

  useScheduler(updateSyncTime);

  return (
    <div className="mco-dashboard__contentColumn">
      <StatusText>{t('Snapshot')}</StatusText>
      <Text className="text-muted">
        {t('Last replicated on: {{ lastSyncTime }}', {
          lastSyncTime: lastSyncTime,
        })}
      </Text>
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
        {getCurrentActivity(activity, failoverCluster, preferredCluster, t)}
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
  const subsCount = selectedApplication?.placementInfo?.reduce(
    (acc, placement) => acc + placement.subscriptions?.length || 0,
    0
  );
  return (
    <div className="mco-dashboard__contentColumn">
      <Text component={TextVariants.h1}>{subsCount}</Text>
      <StatusText>{t('Subscription')}</StatusText>
    </div>
  );
};

export const SubscriptionDetailsTable: React.FC<SubscriptionDetailsTableProps> =
  ({ selectedApplication }) => {
    const { placementInfo } = selectedApplication;
    const { t } = useCustomTranslation();
    const [subsWiseRPO, setSubsWiseRPO] =
      React.useState<SubscriptionWiseRPOMap>({});
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
        const subscriptionRowList = getSubscriptionRow(placementInfo);
        return [
          subscriptionRowList.slice(start, end),
          subscriptionRowList.length,
        ];
      }, [placementInfo, page, perPage]);
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
        <Text component={TextVariants.h3}>{t('Subscription details')}</Text>
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
            perPageComponent="button"
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
