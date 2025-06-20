import * as React from 'react';
import { DRPCStatus } from '@odf/mco/constants';
import { getDRPolicyResourceObj } from '@odf/mco/hooks';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import { getName } from '@odf/shared';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  getReplicationHealth,
  getReplicationType,
  findCluster,
  getDRPolicyName,
  getPrimaryClusterName,
} from '../../../utils';
import { isCleanupPending } from '../../protected-applications/utils';
import DRStatusPopover, { DRStatusProps } from '../dr-status-popover';

export const DiscoveredParser: React.FC<DiscoveredParserProps> = ({
  application: drPlacementControl,
}) => {
  const drPolicyName = getDRPolicyName(drPlacementControl);
  const [drPolicy, drPolicyLoaded, drPolicyLoadError] =
    useK8sWatchResource<DRPolicyKind>({
      ...getDRPolicyResourceObj({ name: drPolicyName }),
    });

  const loaded = drPolicyLoaded;
  const loadError = drPolicyLoadError;

  const drStatus: DRStatusProps = React.useMemo(() => {
    if (!loaded || loadError) return null;

    const schedulingInterval = drPolicy?.spec?.schedulingInterval;

    const primaryClusterName = getPrimaryClusterName(drPlacementControl);
    const targetCluster = findCluster(
      drPolicy.spec?.drClusters as K8sResourceCommon[],
      primaryClusterName
    );

    const volumeLastGroupSyncTime =
      drPlacementControl?.status?.lastGroupSyncTime;
    const lastKubeObjectProtectionTime =
      drPlacementControl?.status?.lastKubeObjectProtectionTime;

    const volumeReplicationHealth = getReplicationHealth(
      volumeLastGroupSyncTime,
      schedulingInterval,
      getReplicationType(drPolicy)
    );

    const kubeObjectSchedulingInterval =
      drPlacementControl?.spec?.kubeObjectProtection?.captureInterval;
    const kubeObjectReplicationHealth = getReplicationHealth(
      lastKubeObjectProtectionTime,
      kubeObjectSchedulingInterval
    );

    return {
      policyName: drPolicyName,
      schedulingInterval,
      primaryCluster: primaryClusterName,
      targetCluster: getName(targetCluster),
      volumeLastGroupSyncTime: volumeLastGroupSyncTime,
      lastKubeObjectProtectionTime: lastKubeObjectProtectionTime,
      volumeReplicationHealth,
      kubeObjectReplicationHealth,
      phase: drPlacementControl?.status?.phase as DRPCStatus,
      isCleanupRequired: isCleanupPending(drPlacementControl),
      isLoadedWOError: loaded && !loadError,
    };
  }, [loaded, loadError, drPolicy, drPlacementControl, drPolicyName]);

  return drStatus && <DRStatusPopover disasterRecoveryStatus={drStatus} />;
};

export default DiscoveredParser;

type DiscoveredParserProps = {
  application: DRPlacementControlKind;
};
