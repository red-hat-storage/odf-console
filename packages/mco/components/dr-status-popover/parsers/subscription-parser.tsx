import * as React from 'react';
import { VolumeReplicationHealth } from '@odf/mco/constants';
import {
  SubscriptionGroupType,
  useSubscriptionResourceWatch,
} from '@odf/mco/hooks';
import { useDisasterRecoveryResourceWatch } from '@odf/mco/hooks';
import { Phase } from '@odf/mco/types';
import {
  findCluster,
  getDRPolicyName,
  getPrimaryClusterName,
  getReplicationHealth,
  getReplicationType,
  getProtectedCondition,
  getAvailableCondition,
} from '@odf/mco/utils';
import { getNamespace, ApplicationKind } from '@odf/shared';
import { getSubscriptionResources } from '../../modals/app-manage-policies/parsers/subscription-parser';
import { getDRResources } from '../../modals/app-manage-policies/utils/parser-utils';
import DRStatusPopover, { DRStatusProps } from '../dr-status-popover';
import { getProgressionFields } from './utils';

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

  const primaryClusterName = getPrimaryClusterName(drpc);
  const drClusters = group.drInfo?.drClusters;
  if (!drClusters) {
    return null;
  }
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

    const drpcInAction = drStatusList.find((status) =>
      [Phase.FailingOver, Phase.Relocating].includes(status.phase as Phase)
    );

    const selectedDRPC = drpcInAction || drStatusList[0];

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
>;

export default SubscriptionParser;
