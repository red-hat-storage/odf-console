import * as React from 'react';
import {
  SubscriptionGroupType,
  useSubscriptionResourceWatch,
} from '@odf/mco/hooks';
import { Progression } from '@odf/mco/types';
import {
  getName,
  getNamespace,
  getResourceCondition,
  ClusterVersionConditionType,
  useCustomTranslation,
} from '@odf/shared';
import { formatTime } from '@odf/shared/details-page/datetime';
import { Button } from '@patternfly/react-core';
import { VolumeReplicationHealth } from '../../constants';
import { getReplicationType, getReplicationHealth } from '../../utils';
import {
  useDRResources,
  getClusterDetails,
  getDRPolicyAndInterval,
  getDRStatusData,
} from './dr-parser-utils';
import DRStatusPopup from './dr-status-popover';

const SubscriptionDRStatusPopover: React.FC<{ application: any }> = ({
  application,
}) => {
  const { t } = useCustomTranslation();
  const [isVisible, setIsVisible] = React.useState(false);

  const [drResources, drLoaded, drLoadError] = useDRResources(
    getNamespace(application)
  );

  const [subscriptionResources, subsResourceLoaded, subsResourceLoadError] =
    useSubscriptionResourceWatch({
      drResources: {
        data: drResources,
        loaded: drLoaded,
        loadError: drLoadError,
      },
    });

  if (
    !drLoaded ||
    !subsResourceLoaded ||
    drLoadError ||
    subsResourceLoadError
  ) {
    return null;
  }

  const subscriptionResource = subscriptionResources.find(
    (subs) => getName(subs.application) === getName(application)
  );
  const subscriptionGroups: SubscriptionGroupType[] =
    subscriptionResource?.subscriptionGroupInfo || [];

  if (!subscriptionGroups.length || !subscriptionGroups[0]?.drInfo?.drPolicy) {
    return null;
  }

  const drpc = subscriptionGroups[0]?.drInfo?.drPlacementControl;
  if (!drpc) {
    return null;
  }

  const { drPolicyName, schedulingInterval } = getDRPolicyAndInterval(
    drResources,
    drpc
  );

  const { primaryCluster, targetCluster } = getClusterDetails(drpc, t);

  const progressingCondition = getResourceCondition(
    drpc,
    ClusterVersionConditionType.Progressing
  );

  const startedOn =
    progressingCondition?.lastTransitionTime &&
    !isNaN(Date.parse(progressingCondition.lastTransitionTime))
      ? formatTime(progressingCondition.lastTransitionTime)
      : t('Unknown');

  // Get the latest sync times for volume replication health
  const syncTimes: string[] = subscriptionGroups
    .map((group) => group.drInfo?.drPlacementControl?.status?.lastGroupSyncTime)
    .filter((time) => time && !isNaN(Date.parse(time))) as string[];

  const replicationType = getReplicationType(schedulingInterval);

  // Determine worst-case sync status
  let worstSyncStatus = VolumeReplicationHealth.HEALTHY;
  if (syncTimes.length === 0) {
    worstSyncStatus = VolumeReplicationHealth.WARNING;
  } else {
    for (const syncTime of syncTimes) {
      const syncStatus = getReplicationHealth(
        syncTime,
        schedulingInterval,
        replicationType
      );
      if (syncStatus === VolumeReplicationHealth.CRITICAL) {
        worstSyncStatus = VolumeReplicationHealth.CRITICAL;
        break;
      } else if (syncStatus === VolumeReplicationHealth.WARNING) {
        worstSyncStatus = VolumeReplicationHealth.WARNING;
      }
    }
  }

  const latestSyncTime =
    syncTimes.length > 0
      ? syncTimes.reduce((latest, current) =>
          current > latest ? current : latest
        )
      : undefined;

  const details = {
    primaryCluster,
    targetCluster,
    startedOn,
    lastSynced: {
      pvc: latestSyncTime ? formatTime(latestSyncTime) : t('Unknown'),
      pvcStatus: worstSyncStatus,
    },
    drPolicy: drPolicyName || t('Unknown'),
    schedulingInterval,
    showKubeObjectStatus: false,
  };

  const statusData = getDRStatusData(
    t,
    drpc?.status?.phase as Progression,
    worstSyncStatus
  );

  return (
    <>
      <Button variant="link" isInline onClick={() => setIsVisible(true)}>
        {statusData.icon}
        <span className="pf-v5-u-pl-sm">{statusData.title}</span>
      </Button>

      {isVisible && (
        <DRStatusPopup
          isOpen={isVisible}
          onClose={() => setIsVisible(false)}
          status={statusData.title}
          details={details}
        />
      )}
    </>
  );
};

export default SubscriptionDRStatusPopover;
