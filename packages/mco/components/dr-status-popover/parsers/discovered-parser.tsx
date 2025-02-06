import * as React from 'react';
import { DRPCStatus } from '@odf/mco/constants';
import { getDRPolicyResourceObj } from '@odf/mco/hooks';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  getReplicationHealth,
  getReplicationType,
  getLastAppDeploymentClusterName,
  findCluster,
  getDRPolicyName,
} from '../../../utils';
import { isCleanupPending } from '../../protected-applications/utils';
import DRStatusPopover from '../dr-status-popover';

export const DiscoveredParser: React.FC<DiscoveredParserProps> = ({
  application,
}) => {
  const drPolicyName = getDRPolicyName(application);
  const [drPolicies, drPolicyLoaded, drPolicyLoadError] = useK8sWatchResource<
    DRPolicyKind[]
  >({
    ...getDRPolicyResourceObj(),
    name: drPolicyName,
  });

  const loaded = drPolicyLoaded;
  const loadError = drPolicyLoadError;

  const drStatus = React.useMemo(() => {
    if (!loaded || loadError) return null;

    const drPolicy = drPolicies?.[0];
    const schedulingInterval = drPolicy?.spec?.schedulingInterval;

    if (!drPolicy?.spec?.drClusters) {
      return null;
    }
    const primaryClusterName = getLastAppDeploymentClusterName(application);
    const targetCluster = findCluster(
      drPolicy.spec.drClusters as K8sResourceCommon[],
      primaryClusterName
    );

    const volumeLastGroupSyncTime = application?.status?.lastGroupSyncTime;
    const lastKubeObjectProtectionTime =
      application?.status?.lastKubeObjectProtectionTime;

    const volumeReplicationHealth = getReplicationHealth(
      volumeLastGroupSyncTime,
      schedulingInterval,
      getReplicationType(schedulingInterval)
    );

    const kubeObjectSchedulingInterval =
      application?.spec?.kubeObjectProtection?.captureInterval;
    const kubeObjectReplicationHealth = getReplicationHealth(
      lastKubeObjectProtectionTime,
      kubeObjectSchedulingInterval,
      getReplicationType(kubeObjectSchedulingInterval)
    );

    return {
      policyName: drPolicyName,
      schedulingInterval,
      primaryCluster: primaryClusterName,
      targetCluster: targetCluster.metadata?.name,
      volumeLastGroupSyncTime: volumeLastGroupSyncTime,
      lastKubeObjectProtectionTime: lastKubeObjectProtectionTime,
      volumeReplicationHealth,
      kubeObjectReplicationHealth,
      phase: application?.status?.phase as DRPCStatus,
      isCleanupRequired: isCleanupPending(application),
      isLoaded: loaded && !loadError,
    };
  }, [loaded, loadError, drPolicies, application, drPolicyName]);

  return drStatus && <DRStatusPopover disasterRecoveryStatus={drStatus} />;
};

export default DiscoveredParser;

type DiscoveredParserProps = {
  application: DRPlacementControlKind;
};
