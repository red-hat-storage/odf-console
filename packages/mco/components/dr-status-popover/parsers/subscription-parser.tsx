import * as React from 'react';
import { DRActionType, VolumeReplicationHealth } from '@odf/mco/constants';
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
  action?: string;
  protectedCondition?: K8sResourceCondition;
  isRevertingTestFailover?: boolean;
};

// ACM Applications shows one DR status cell per Subscription app. When that
// app has several DRPC groups, pick the group that most needs attention.
// Live Failover/Relocate stays above protection errors (same as the previous
// "drpcInAction || first" selector). Protection still beats idle / dry-run.
const SubscriptionDRStatusPriority = {
  USER_ACTION: 0,
  LIVE_OPERATION: 1,
  PROTECTION_ERROR: 2,
  ACTIVE_TEST_HOLD: 3,
  TEST_IN_PROGRESS_OR_ENDING: 4,
  IDLE: 5,
} as const;

const isLiveFailoverOrRelocate = (status: SubscriptionStatus): boolean => {
  if (status.dryRun) return false;
  if (status.phase === Phase.FailingOver || status.phase === Phase.Relocating) {
    return true;
  }
  // Match getDRStatus: Initiating/Deploying with an FO/Relocate action.
  return (
    (status.phase === Phase.Initiating || status.phase === Phase.Deploying) &&
    (status.action === DRActionType.FAILOVER ||
      status.action === DRActionType.RELOCATE)
  );
};

const subscriptionStatusRank = (status: SubscriptionStatus): number => {
  if (
    status.phase === Phase.WaitForUser ||
    status.progression === Progression.WaitOnUserToCleanUp
  ) {
    return SubscriptionDRStatusPriority.USER_ACTION;
  }
  if (isLiveFailoverOrRelocate(status)) {
    return SubscriptionDRStatusPriority.LIVE_OPERATION;
  }
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
  // Managed test abort: dryRun is cleared while Cleaning Up; keep above idle.
  if (
    status.dryRun ||
    (status.progression === Progression.TestingFailover &&
      status.phase !== Phase.Deleting) ||
    (status.isRevertingTestFailover &&
      status.progression === Progression.CleaningUp)
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
    ...getProgressionFields(drpc, drClusters?.map(getName) || []),
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
          availableCondition: selectedDRPC.availableCondition,
          dryRun: selectedDRPC.dryRun,
          hasTestFailoverAnnotation: selectedDRPC.hasTestFailoverAnnotation,
          hasVolumes: selectedDRPC.hasVolumes,
          testFailoverCleanupCluster: selectedDRPC.testFailoverCleanupCluster,
          promotedFromTest: selectedDRPC.promotedFromTest,
          isRevertingTestFailover: selectedDRPC.isRevertingTestFailover,
          lastAction: selectedDRPC.lastAction,
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
  | 'hasTestFailoverAnnotation'
  | 'hasVolumes'
  | 'testFailoverCleanupCluster'
  | 'promotedFromTest'
  | 'isRevertingTestFailover'
  | 'lastAction'
  | 'drpcName'
  | 'drpcNamespace'
>;

export default SubscriptionParser;
