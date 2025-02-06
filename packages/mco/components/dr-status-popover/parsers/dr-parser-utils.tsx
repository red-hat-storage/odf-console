import * as React from 'react';
import { VolumeReplicationHealth } from '@odf/mco/constants';
import { useDisasterRecoveryResourceWatch } from '@odf/mco/hooks';
import {
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
} from '@odf/mco/hooks';
import { Progression } from '@odf/mco/types';
import { findDRType, getReplicationHealth } from '@odf/mco/utils';
import {
  ClusterVersionConditionType,
  getResourceCondition,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared';
import { formatTime } from '@odf/shared/details-page/datetime';
import { InProgressIcon } from '@patternfly/react-icons';

export const useDRResources = (namespace: string) => {
  return useDisasterRecoveryResourceWatch({
    resources: {
      drClusters: getDRClusterResourceObj(),
      drPolicies: getDRPolicyResourceObj(),
      drPlacementControls: getDRPlacementControlResourceObj({ namespace }),
    },
  });
};

export const getDRStatusData = (
  t: Function,
  phase?: Progression,
  worstSyncStatus?: VolumeReplicationHealth
) => {
  if (phase === Progression.FailingOver || phase === Progression.Relocating) {
    return { icon: <InProgressIcon />, title: t(phase), status: phase };
  }

  if (!worstSyncStatus) {
    return {
      icon: <YellowExclamationTriangleIcon />,
      title: t('Warning'),
      status: VolumeReplicationHealth.WARNING,
    };
  }

  switch (worstSyncStatus) {
    case VolumeReplicationHealth.CRITICAL:
      return {
        icon: <RedExclamationCircleIcon />,
        title: t('Critical'),
        status: worstSyncStatus,
      };
    case VolumeReplicationHealth.WARNING:
      return {
        icon: <YellowExclamationTriangleIcon />,
        title: t('Warning'),
        status: worstSyncStatus,
      };
    default:
      return {
        icon: <GreenCheckCircleIcon />,
        title: t('Healthy'),
        status: VolumeReplicationHealth.HEALTHY,
      };
  }
};

export const getDRPolicyAndInterval = (drResources, drpc) => {
  const drPolicyName = drpc?.spec?.drPolicyRef?.name;
  const drPolicy = drResources?.drPolicies?.find(
    (policy) => policy.metadata?.name === drPolicyName
  );
  return {
    drPolicyName,
    schedulingInterval: drPolicy?.spec?.schedulingInterval || 'Unknown',
  };
};

export const getClusterDetails = (drpc, t) => {
  return {
    primaryCluster:
      drpc?.status?.preferredDecision?.clusterName || t('Unknown'),
    targetCluster:
      drpc?.status?.phase === 'FailingOver'
        ? drpc?.spec?.failoverCluster || t('Unknown')
        : drpc?.spec?.preferredCluster || t('Unknown'),
  };
};

export const getStartedOnTime = (drpc, t) => {
  const progressingCondition = getResourceCondition(
    drpc,
    ClusterVersionConditionType.Progressing
  );

  return progressingCondition?.lastTransitionTime &&
    !isNaN(Date.parse(progressingCondition.lastTransitionTime))
    ? formatTime(progressingCondition.lastTransitionTime)
    : t('Unknown');
};

export const computeReplicationHealth = (
  syncTimes,
  schedulingInterval,
  drClusters
) => {
  let worstSyncStatus = VolumeReplicationHealth.HEALTHY;

  if (syncTimes.length === 0) {
    worstSyncStatus = VolumeReplicationHealth.WARNING;
  } else {
    for (const syncTime of syncTimes) {
      const syncStatus = getReplicationHealth(
        syncTime,
        schedulingInterval,
        findDRType(drClusters)
      );
      if (syncStatus === VolumeReplicationHealth.CRITICAL) {
        worstSyncStatus = VolumeReplicationHealth.CRITICAL;
        break;
      } else if (syncStatus === VolumeReplicationHealth.WARNING) {
        worstSyncStatus = VolumeReplicationHealth.WARNING;
      }
    }
  }

  return worstSyncStatus;
};
