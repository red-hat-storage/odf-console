import * as React from 'react';
import { DRPCStatus, VolumeReplicationHealth } from '@odf/mco/constants';
import {
  DisasterRecoveryResourceKind,
  getDRPlacementControlResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  getPlacementRuleResourceObj,
  getSubscriptionResourceObj,
  SubscriptionGroupType,
  useSubscriptionResourceWatch,
} from '@odf/mco/hooks';
import { useDisasterRecoveryResourceWatch } from '@odf/mco/hooks';
import {
  getDRClusterResourceObj,
  getDRPolicyResourceObj,
} from '@odf/mco/hooks';
import {
  findCluster,
  getDRPolicyName,
  getLastAppDeploymentClusterName,
  getReplicationHealth,
  getReplicationType,
} from '@odf/mco/utils';
import { getNamespace, ApplicationKind } from '@odf/shared';
import DRStatusPopover from '../dr-status-popover';
import { DRStatusProps } from './dr-parser-utils';

const getMostSevereHealthStatus = (
  drStatusList: {
    healthStatus: VolumeReplicationHealth;
  }[]
): VolumeReplicationHealth => {
  return drStatusList.reduce((acc: VolumeReplicationHealth, health) => {
    if (health.healthStatus === VolumeReplicationHealth.CRITICAL) {
      return VolumeReplicationHealth.CRITICAL;
    } else if (
      health.healthStatus === VolumeReplicationHealth.WARNING &&
      acc !== VolumeReplicationHealth.CRITICAL
    ) {
      return VolumeReplicationHealth.WARNING;
    }
    return acc;
  }, VolumeReplicationHealth.HEALTHY);
};

const parseDRStatusForGroup = (
  group: SubscriptionGroupType
): {
  drPolicyName: string;
  schedulingInterval?: string;
  primaryCluster: string;
  targetCluster?: string;
  lastGroupSyncTime: string;
  healthStatus: VolumeReplicationHealth;
  phase: string;
} | null => {
  const drpc = group.drInfo?.drPlacementControl;
  if (!drpc) return null;

  const drPolicyName = getDRPolicyName(drpc);
  const schedulingInterval = group.drInfo?.drPolicy?.spec?.schedulingInterval;

  const primaryClusterName = getLastAppDeploymentClusterName(drpc);
  const drClusters = group.drInfo?.drClusters;
  if (!drClusters) {
    return null;
  }
  const targetCluster = findCluster(drClusters, primaryClusterName);

  const lastGroupSyncTime: string = drpc?.status?.lastGroupSyncTime;
  const replicationType = getReplicationType(schedulingInterval);

  const healthStatus = getReplicationHealth(
    lastGroupSyncTime,
    schedulingInterval,
    replicationType
  );

  return {
    drPolicyName,
    schedulingInterval,
    primaryCluster: primaryClusterName,
    targetCluster: targetCluster?.metadata?.name,
    lastGroupSyncTime,
    healthStatus,
    phase: drpc?.status?.phase,
  };
};

const getDRResources = (
  namespace: string
): {
  resources: {
    drPolicies: ReturnType<typeof getDRPolicyResourceObj>;
    drClusters: ReturnType<typeof getDRClusterResourceObj>;
    drPlacementControls: ReturnType<typeof getDRPlacementControlResourceObj>;
  };
} => ({
  resources: {
    drPolicies: getDRPolicyResourceObj(),
    drClusters: getDRClusterResourceObj(),
    drPlacementControls: getDRPlacementControlResourceObj({
      namespace,
    }),
  },
});

const getSubscriptionResources = (
  application: ApplicationKind,
  namespace: string,
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any
): {
  resources: {
    subscriptions: ReturnType<typeof getSubscriptionResourceObj>;
    placementRules: ReturnType<typeof getPlacementRuleResourceObj>;
    placements: ReturnType<typeof getPlacementResourceObj>;
    placementDecisions: ReturnType<typeof getPlacementDecisionsResourceObj>;
  };
  drResources: {
    data: DisasterRecoveryResourceKind;
    loaded: boolean;
    loadError: any;
  };
  overrides: {
    applications: {
      data: ApplicationKind;
      loaded: boolean;
      loadError: string;
    };
  };
} => ({
  resources: {
    subscriptions: getSubscriptionResourceObj({
      namespace,
    }),
    placementRules: getPlacementRuleResourceObj({
      namespace,
    }),
    placements: getPlacementResourceObj({
      namespace,
    }),
    placementDecisions: getPlacementDecisionsResourceObj({
      namespace,
    }),
  },
  drResources: {
    data: drResources,
    loaded: drLoaded,
    loadError: drLoadError,
  },
  overrides: {
    applications: {
      data: application,
      loaded: true,
      loadError: '',
    },
  },
});

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
        drLoadError
      )
    );

  const allLoaded: boolean =
    drLoaded && subsResourceLoaded && !drLoadError && !subsResourceLoadError;

  const drStatus: DRStatusProps = React.useMemo(() => {
    if (!allLoaded) return null;

    const subscriptionResource = subscriptionResourceList?.[0];
    const subscriptionGroups: SubscriptionGroupType[] =
      subscriptionResource?.subscriptionGroupInfo || [];

    const drStatusList = subscriptionGroups
      .map((group) => parseDRStatusForGroup(group))
      .filter(Boolean);

    const mostSevereHealthStatus = getMostSevereHealthStatus(drStatusList);

    const ongoingDrAction = drStatusList.find(
      (status) =>
        status.phase === DRPCStatus.FailingOver ||
        status.phase === DRPCStatus.Relocating
    );

    const selectedDRPC = ongoingDrAction || drStatusList[0];

    return selectedDRPC
      ? {
          policyName: selectedDRPC.drPolicyName,
          schedulingInterval: selectedDRPC.schedulingInterval,
          primaryCluster: selectedDRPC.primaryCluster,
          targetCluster: selectedDRPC.targetCluster,
          volumeReplicationHealth: mostSevereHealthStatus,
          volumeLastGroupSyncTime: selectedDRPC.lastGroupSyncTime,
          phase: selectedDRPC.phase as DRPCStatus,
          isLoaded: allLoaded,
        }
      : null;
  }, [allLoaded, subscriptionResourceList]);

  return drStatus && <DRStatusPopover disasterRecoveryStatus={drStatus} />;
};

type SubscriptionParserProps = {
  application: ApplicationKind;
};

export default SubscriptionParser;
