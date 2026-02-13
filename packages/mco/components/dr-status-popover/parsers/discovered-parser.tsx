import * as React from 'react';
import { getDRPolicyResourceObj } from '@odf/mco/hooks';
import { DRPlacementControlKind, DRPolicyKind, Phase } from '@odf/mco/types';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  getReplicationHealth,
  getReplicationType,
  getDRPolicyName,
  getPrimaryClusterName,
  getProtectedCondition,
  getAvailableCondition,
} from '../../../utils';
import { isCleanupPending } from '../../protected-applications/utils';
import DRStatusPopover, { DRStatusProps } from '../dr-status-popover';
import { getProgressionFields } from './utils';

export const DRPlacementControlParser: React.FC<
  DRPlacementControlParserProps
> = ({ application: drPlacementControl }) => {
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
    const targetCluster = drPolicy?.spec?.drClusters?.find(
      (name) => name !== primaryClusterName
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

    const kubeObjectReplicationHealth = kubeObjectSchedulingInterval
      ? getReplicationHealth(
          lastKubeObjectProtectionTime,
          kubeObjectSchedulingInterval
        )
      : undefined;

    const protectedCondition = getProtectedCondition(drPlacementControl);
    const availableCondition = getAvailableCondition(drPlacementControl);

    return {
      policyName: drPolicyName,
      schedulingInterval,
      primaryCluster: primaryClusterName,
      targetCluster: targetCluster,
      volumeLastGroupSyncTime: volumeLastGroupSyncTime,
      lastKubeObjectProtectionTime: lastKubeObjectProtectionTime,
      volumeReplicationHealth,
      kubeObjectReplicationHealth,
      phase: drPlacementControl?.status?.phase as Phase,
      isCleanupRequired: isCleanupPending(drPlacementControl),
      isLoadedWOError: loaded && !loadError,
      ...getProgressionFields(drPlacementControl),
      protectedCondition,
      availableCondition,
    };
  }, [loaded, loadError, drPolicy, drPlacementControl, drPolicyName]);

  return drStatus && <DRStatusPopover disasterRecoveryStatus={drStatus} />;
};

export default DRPlacementControlParser;

type DRPlacementControlParserProps = {
  application: DRPlacementControlKind;
};
