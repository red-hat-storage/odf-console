/**
 * Add components specific to appicaltion-wise card here
 */

import * as React from 'react';
import { VOLUME_REPLICATION_HEALTH, DRPC_STATUS } from '@odf/mco/constants';
import {
  PlacementInfo,
  ProtectedAppSetsMap,
  ProtectedPVCData,
} from '@odf/mco/types';
import { getVolumeReplicationHealth, getDRStatus } from '@odf/mco/utils';
import { utcDateTimeFormatter } from '@odf/shared/details-page/datetime';
import {
  fromNow,
  getTimeDifferenceInSeconds,
} from '@odf/shared/details-page/datetime';
import { URL_POLL_DEFAULT_DELAY } from '@odf/shared/hooks/custom-prometheus-poll/use-url-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  PrometheusResponse,
  StatusIconAndText,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { TextVariants, Text } from '@patternfly/react-core';
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

type ProtectedPVCsSectionProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedAppSet: ProtectedAppSetsMap;
};

type CommonProps = {
  selectedAppSet: ProtectedAppSetsMap;
  lastSyncTimeData?: PrometheusResponse;
};
