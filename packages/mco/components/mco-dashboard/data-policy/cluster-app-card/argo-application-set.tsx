/**
 * Add components specific to appicaltion-wise card here
 */

import * as React from 'react';
import {
  VOLUME_REPLICATION_HEALTH,
  DRPC_STATUS,
  ACM_ENDPOINT,
  HUB_CLUSTER_NAME,
  TIME_UNITS,
} from '@odf/mco/constants';
import {
  PlacementInfo,
  ProtectedAppSetsMap,
  ProtectedPVCData,
} from '@odf/mco/types';
import {
  getVolumeReplicationHealth,
  getDRStatus,
  convertSyncIntervalToSeconds,
} from '@odf/mco/utils';
import { mapLimitsRequests } from '@odf/shared/charts';
import { AreaChart } from '@odf/shared/dashboards/utilization-card/area-chart';
import { trimSecondsXMutator } from '@odf/shared/dashboards/utilization-card/utilization-item';
import { utcDateTimeFormatter } from '@odf/shared/details-page/datetime';
import {
  fromNow,
  getTimeDifferenceInSeconds,
} from '@odf/shared/details-page/datetime';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { URL_POLL_DEFAULT_DELAY } from '@odf/shared/hooks/custom-prometheus-poll/use-url-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  humanizeMinutes,
  humanizeHours,
  humanizeDays,
} from '@odf/shared/utils';
import {
  PrometheusResponse,
  StatusIconAndText,
} from '@openshift-console/dynamic-plugin-sdk';
import { UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useUtilizationDuration } from '@openshift-console/dynamic-plugin-sdk-internal';
import { TFunction } from 'i18next';
import { TextVariants, Text } from '@patternfly/react-core';
import { getLastSyncTimeDRPCQuery } from '../../queries';
import { StatusText } from './common';

const getCurrentActivity = (
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
    return t('{{ currentStatus }} to {{ preferredCluster }}', {
      currentStatus,
      preferredCluster,
    });
  } else if (
    [DRPC_STATUS.FailingOver, DRPC_STATUS.FailedOver].includes(
      currentStatus as DRPC_STATUS
    )
  ) {
    return t('{{ currentStatus }} to {{ failoverCluster }}', {
      currentStatus,
      failoverCluster,
    });
  } else {
    return t('Unknown');
  }
};

export const ProtectedPVCsSection: React.FC<ProtectedPVCsSectionProps> = ({
  protectedPVCData,
  selectedAppSet,
}) => {
  const { t } = useCustomTranslation();
  const clearSetIntervalId = React.useRef<NodeJS.Timeout>();
  const [protectedPVC, setProtectedPVC] = React.useState([0, 0]);
  const [protectedPVCsCount, pvcsWithIssueCount] = protectedPVC;

  const updateProtectedPVC = React.useCallback(() => {
    const placementInfo = selectedAppSet?.placementInfo?.[0];
    const issueCount =
      protectedPVCData?.reduce((acc, protectedPVC) => {
        if (
          protectedPVC?.drpcName === placementInfo?.drpcName &&
          protectedPVC?.drpcNamespace === placementInfo?.drpcNamespace &&
          getVolumeReplicationHealth(
            getTimeDifferenceInSeconds(protectedPVC?.lastSyncTime),
            protectedPVC?.schedulingInterval
          )[0] !== VOLUME_REPLICATION_HEALTH.HEALTHY
        )
          return acc + 1;
        else return acc;
      }, 0) || 0;

    setProtectedPVC([protectedPVCData?.length || 0, issueCount]);
  }, [selectedAppSet, protectedPVCData, setProtectedPVC]);

  React.useEffect(() => {
    updateProtectedPVC();
    clearSetIntervalId.current = setInterval(
      updateProtectedPVC,
      URL_POLL_DEFAULT_DELAY
    );
    return () => clearInterval(clearSetIntervalId.current);
  }, [updateProtectedPVC]);

  return (
    <div className="mco-dashboard__contentColumn">
      <Text component={TextVariants.h1}>{protectedPVCsCount}</Text>
      <StatusText>{t('Protected PVCs')}</StatusText>
      <Text className="text-muted">
        {t('{{ pvcsWithIssueCount }} with issues', { pvcsWithIssueCount })}
      </Text>
    </div>
  );
};

export const ActivitySection: React.FC<CommonProps> = ({ selectedAppSet }) => {
  const { t } = useCustomTranslation();

  const placementInfo: PlacementInfo = selectedAppSet?.placementInfo?.[0];
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

export const SnapshotSection: React.FC<CommonProps> = ({ selectedAppSet }) => {
  const { t } = useCustomTranslation();
  const [lastSyncTime, setLastSyncTime] = React.useState('N/A');
  const lastGroupSyncTime =
    selectedAppSet?.placementInfo?.[0]?.lastGroupSyncTime;
  const clearSetIntervalId = React.useRef<NodeJS.Timeout>();
  const updateSyncTime = React.useCallback(() => {
    if (!!lastGroupSyncTime) {
      const dateTime = utcDateTimeFormatter.format(new Date(lastGroupSyncTime));
      setLastSyncTime(`${dateTime} (${fromNow(lastGroupSyncTime)})`);
    } else {
      setLastSyncTime('N/A');
    }
  }, [lastGroupSyncTime]);

  React.useEffect(() => {
    updateSyncTime();
    clearSetIntervalId.current = setInterval(
      updateSyncTime,
      URL_POLL_DEFAULT_DELAY
    );
    return () => clearInterval(clearSetIntervalId.current);
  }, [updateSyncTime]);

  return (
    <div className="mco-dashboard__contentColumn">
      <StatusText>{t('Snapshot')}</StatusText>
      <Text className="text-muted">
        {t('Last on: {{ lastSyncTime }}', {
          lastSyncTime: lastSyncTime,
        })}
      </Text>
    </div>
  );
};

export const ReplicationHistorySection: React.FC<ReplicationHistorySectionProps> =
  ({ selectedAppSet }) => {
    const { t } = useCustomTranslation();
    const { duration } = useUtilizationDuration();

    const placementInfo = selectedAppSet?.placementInfo?.[0];
    const [threshold, initialUnit] = convertSyncIntervalToSeconds(
      placementInfo?.syncInterval
    );
    const drpcName = placementInfo?.drpcName;
    const drpcNamespace = placementInfo?.drpcNamespace;
    const [pvcsSLARangeData, pvcsSLARangeError, pvcsSLARangeLoading] =
      useCustomPrometheusPoll({
        endpoint: 'api/v1/query_range' as any,
        query:
          !!drpcNamespace && !!drpcName
            ? getLastSyncTimeDRPCQuery(drpcName, drpcNamespace)
            : null,
        timespan: duration,
        basePath: ACM_ENDPOINT,
        cluster: HUB_CLUSTER_NAME,
      });

    const { data, chartStyle } = mapLimitsRequests({
      utilization: pvcsSLARangeData,
      xMutator: trimSecondsXMutator,
      threshold,
      description: t('Measured interval'),
      thresholdDescription: t('Scheduled interval'),
      t,
    });

    return (
      <div className="mco-dashboard__contentColumn">
        <div className="mco-dashboard__contentRow mco-cluster-app__contentRow--spaceBetween">
          <Text
            component={TextVariants.h3}
            className="mco-cluster-app__contentRow--flexStart"
          >
            {t('Replication history')}
          </Text>
          <div className="mco-dashboard__contentRow mco-cluster-app__contentRow--flexEnd">
            <UtilizationDurationDropdown />
          </div>
        </div>
        <AreaChart
          data={data}
          loading={!pvcsSLARangeError && pvcsSLARangeLoading}
          humanize={
            (initialUnit === TIME_UNITS.Days && humanizeDays) ||
            (initialUnit === TIME_UNITS.Hours && humanizeHours) ||
            (initialUnit === TIME_UNITS.Minutes && humanizeMinutes)
          }
          chartStyle={chartStyle}
          mainDataName="Replication interval"
        />
      </div>
    );
  };

type ProtectedPVCsSectionProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedAppSet: ProtectedAppSetsMap;
};

type CommonProps = {
  selectedAppSet: ProtectedAppSetsMap;
  lastSyncTimeData?: PrometheusResponse;
};

type ReplicationHistorySectionProps = {
  selectedAppSet: ProtectedAppSetsMap;
};
