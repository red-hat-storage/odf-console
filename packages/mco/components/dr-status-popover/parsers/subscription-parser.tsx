import * as React from 'react';
import { VolumeReplicationHealth } from '@odf/mco/constants';
import {
  SubscriptionGroupType,
  useSubscriptionResourceWatch,
} from '@odf/mco/hooks';
import { useDisasterRecoveryResourceWatch } from '@odf/mco/hooks';
import { Phase, Progression } from '@odf/mco/types';
import {
  findCluster,
  getDRPolicyName,
  resolvePrimaryClusterName,
  getReplicationHealth,
  getReplicationType,
  getProtectedCondition,
  getAvailableCondition,
} from '@odf/mco/utils';
import { shouldShowProtectionError } from '@odf/mco/utils/dr-status';
import { getName, getNamespace, ApplicationKind } from '@odf/shared';
import { K8sResourceCondition } from '@odf/shared/types';
import { getSubscriptionResources } from '../../modals/app-manage-policies/parsers/subscription-parser';
import { getDRResources } from '../../modals/app-manage-policies/utils/parser-utils';
import DRStatusPopover, { DRStatusProps } from '../dr-status-popover';
import { getProgressionFields } from './utils';

type SubscriptionStatus = {
  phase?: Phase | string;
  dryRun?: boolean;
  progression?: string;
  protectedCondition?: K8sResourceCondition;
};

// ACM Applications shows one DR status cell per Subscription app. When that
// app has several DRPC groups, pick the group that most needs attention.
const SubscriptionDRStatusPriority = {
  USER_ACTION: 0,
  PROTECTION_ERROR: 1,
  ACTIVE_TEST_HOLD: 2,
  LIVE_OPERATION: 3,
  TEST_IN_PROGRESS_OR_ENDING: 4,
  IDLE: 5,
} as const;

const subscriptionStatusRank = (status: SubscriptionStatus): number => {
  if (
    status.phase === Phase.WaitForUser ||
    status.progression === Progression.WaitOnUserToCleanUp
  ) {
    return SubscriptionDRStatusPriority.USER_ACTION;
  }
  // Keep a deployed group's protection error visible even when another group
  // is in a dry-run test — the cell forwards only the selected group's
  // protectedCondition.
  if (shouldShowProtectionError(status.protectedCondition)) {
    return SubscriptionDRStatusPriority.PROTECTION_ERROR;
  }
  if (
    status.dryRun &&
    status.progression === Progression.TestingFailover &&
    status.phase !== Phase.Deleting
  ) {
    return SubscriptionDRStatusPriority.ACTIVE_TEST_HOLD;
  }
  if (
    !status.dryRun &&
    (status.phase === Phase.FailingOver || status.phase === Phase.Relocating)
  ) {
    return SubscriptionDRStatusPriority.LIVE_OPERATION;
  }
  if (
    status.dryRun ||
    (status.progression === Progression.TestingFailover &&
      status.phase !== Phase.Deleting)
  ) {
    return SubscriptionDRStatusPriority.TEST_IN_PROGRESS_OR_ENDING;
  }
  return SubscriptionDRStatusPriority.IDLE;
};

export const selectSubscriptionDRStatus = <T extends SubscriptionStatus>(
  statuses: T[]
): T | undefined =>
  statuses.reduce<T | undefined>((selected, status) => {
    if (
      !selected ||
      subscriptionStatusRank(status) < subscriptionStatusRank(selected)
    ) {
      return status;
    }
    return selected;
  }, undefined);

const getMostSevereHealthStatus = (
  drStatusList: { volumeReplicationHealth: VolumeReplicationHealth }[]
): VolumeReplicationHealth => {
  const severityOrder: VolumeReplicationHealth[] = [
    VolumeReplicationHealth.CRITICAL,
    VolumeReplicationHealth.WARNING,
    VolumeReplicationHealth.HEALTHY,
  ];
  return (
    severityOrder.find((status) =>
      drStatusList.some(
        ({ volumeReplicationHealth }) => volumeReplicationHealth === status
      )
    ) || VolumeReplicationHealth.HEALTHY
  );
};

const parseDRStatusForGroup = (
  group: SubscriptionGroupType
): DRStatusForGroup => {
  const drpc = group.drInfo?.drPlacementControl;
  if (!drpc) return null;

  const drPolicyName = getDRPolicyName(drpc);
  const schedulingInterval = group.drInfo?.drPolicy?.spec?.schedulingInterval;

  const drClusters = group.drInfo?.drClusters;
  if (!drClusters) {
    return null;
  }

  const primaryClusterName = resolvePrimaryClusterName(
    drpc,
    drClusters.map(getName)
  );
  const targetCluster = findCluster(drClusters, primaryClusterName);

  const lastGroupSyncTime: string = drpc?.status?.lastGroupSyncTime;
  const replicationType = getReplicationType(group.drInfo?.drPolicy);

  const volumeReplicationHealth = getReplicationHealth(
    lastGroupSyncTime,
    schedulingInterval,
    replicationType
  );

  const protectedCondition = getProtectedCondition(drpc);
  const availableCondition = getAvailableCondition(drpc);

  return {
    drPolicyName,
    schedulingInterval,
    primaryCluster: primaryClusterName,
    targetCluster: targetCluster?.metadata?.name,
    lastGroupSyncTime,
    volumeReplicationHealth,
    phase: drpc?.status?.phase,
    ...getProgressionFields(drpc),
    protectedCondition,
    availableCondition,
  };
};

export const SubscriptionParser: React.FC<SubscriptionParserProps> = ({
  application,
}) => {
  const namespace = getNamespace(application);

  const [drResources, drLoaded, drLoadError] = useDisasterRecoveryResourceWatch(
    getDRResources(namespace)
  );

  const [subscriptionResourceList, subsResourceLoaded, subsResourceLoadError] =
    useSubscriptionResourceWatch(
      getSubscriptionResources(
        application,
        namespace,
        drResources,
        drLoaded,
        drLoadError,
        undefined,
        false
      )
    );

  const isLoadedWOError: boolean = subsResourceLoaded && !subsResourceLoadError;

  const drStatus: DRStatusProps = React.useMemo(() => {
    const subscriptionResource = subscriptionResourceList?.[0];
    const subscriptionGroups: SubscriptionGroupType[] =
      subscriptionResource?.subscriptionGroupInfo || [];

    const drStatusList = subscriptionGroups
      .map((group) => parseDRStatusForGroup(group))
      .filter(Boolean);

    const mostSevereHealthStatus = getMostSevereHealthStatus(drStatusList);

    const selectedDRPC = selectSubscriptionDRStatus(drStatusList);

    return selectedDRPC
      ? {
          policyName: selectedDRPC.drPolicyName,
          schedulingInterval: selectedDRPC.schedulingInterval,
          primaryCluster: selectedDRPC.primaryCluster,
          targetCluster: selectedDRPC.targetCluster,
          volumeReplicationHealth: mostSevereHealthStatus,
          volumeLastGroupSyncTime: selectedDRPC.lastGroupSyncTime,
          phase: selectedDRPC.phase as Phase,
          isLoadedWOError: isLoadedWOError,
          action: selectedDRPC.action,
          progression: selectedDRPC.progression,
          actionStartTime: selectedDRPC.actionStartTime,
          progressionDetails: selectedDRPC.progressionDetails,
          applicationName: selectedDRPC.applicationName,
          protectedCondition: selectedDRPC.protectedCondition,
          dryRun: selectedDRPC.dryRun,
          testFailoverCleanupCluster: selectedDRPC.testFailoverCleanupCluster,
          promotedFromTest: selectedDRPC.promotedFromTest,
          lastAction: selectedDRPC.lastAction,
          lastAppCluster: selectedDRPC.lastAppCluster,
          drpcName: selectedDRPC.drpcName,
          drpcNamespace: selectedDRPC.drpcNamespace,
        }
      : null;
  }, [isLoadedWOError, subscriptionResourceList]);

  return drStatus && <DRStatusPopover disasterRecoveryStatus={drStatus} />;
};

type SubscriptionParserProps = {
  application: ApplicationKind;
};

type DRStatusForGroup = {
  drPolicyName: string;
  schedulingInterval?: string;
  primaryCluster: string;
  targetCluster?: string;
  lastGroupSyncTime: string;
  volumeReplicationHealth: VolumeReplicationHealth;
  phase: Phase;
} & Pick<
  DRStatusProps,
  | 'progression'
  | 'action'
  | 'actionStartTime'
  | 'progressionDetails'
  | 'applicationName'
  | 'protectedCondition'
  | 'availableCondition'
  | 'dryRun'
  | 'testFailoverCleanupCluster'
  | 'promotedFromTest'
  | 'lastAction'
  | 'lastAppCluster'
  | 'drpcName'
  | 'drpcNamespace'
>;

export default SubscriptionParser;
