/**
 * Add components specific to appicaltion-wise card here
 */

import * as React from 'react';
import { DRPC_STATUS } from '@odf/mco/constants';
import { PlacementInfo, ProtectedAppsMap } from '@odf/mco/types';
import { getDRStatus } from '@odf/mco/utils';
import { utcDateTimeFormatter } from '@odf/shared/details-page/datetime';
import { fromNow } from '@odf/shared/details-page/datetime';
import { URL_POLL_DEFAULT_DELAY } from '@odf/shared/hooks/custom-prometheus-poll/use-url-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  PrometheusResponse,
  StatusIconAndText,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { Text } from '@patternfly/react-core';
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
        {t('Last replicated on: {{ lastSyncTime }}', {
          lastSyncTime: lastSyncTime,
        })}
      </Text>
    </div>
  );
};

type CommonProps = {
  selectedApplication: ProtectedAppsMap;
  lastSyncTimeData?: PrometheusResponse;
};
