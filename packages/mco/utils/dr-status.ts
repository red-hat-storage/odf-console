import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import {
  K8sResourceCondition,
  K8sResourceConditionStatus,
} from '@odf/shared/types';
import {
  VolumeReplicationHealth,
  DRProtectionStatus,
  DRActionType,
  THRESHOLD,
} from '../constants';
import {
  Phase,
  Progression,
  DRPlacementControlConditionReason,
  VRGConditionReason,
  VRGConditionType,
} from '../types/ramen';
import { getVolumeReplicationHealth } from '../utils';

/**
 * Unified DR Status enum - Single source of truth for all DR status values.
 * Combines Phase, Progression, VolumeReplicationHealth, and custom protection statuses.
 */
export enum DRStatus {
  // Phases from ramen.ts
  WaitForUser = Phase.WaitForUser,
  Deleting = Phase.Deleting,
  FailingOver = Phase.FailingOver,
  Relocating = Phase.Relocating,
  FailedOver = Phase.FailedOver,
  Relocated = Phase.Relocated,

  // Progressions from ramen.ts
  WaitOnUserToCleanUp = Progression.WaitOnUserToCleanUp,

  // Volume replication health
  Critical = VolumeReplicationHealth.CRITICAL,
  Warning = VolumeReplicationHealth.WARNING,
  Healthy = VolumeReplicationHealth.HEALTHY,

  // Protection status
  Protecting = DRProtectionStatus.Protecting,
  ProtectionError = DRProtectionStatus.ProtectionError,

  // DryRun testing failover
  TestingFailover = Progression.TestingFailover,

  // Additional statuses
  Unknown = 'Unknown',
  Available = 'Available',
}

/**
 * Determines if replication is healthy based on volume and kube object health status.
 * Exported for use in dr-status-popover.
 */
export const isReplicationHealthy = (
  volumeReplicationHealth: VolumeReplicationHealth,
  kubeObjectReplicationHealth?: VolumeReplicationHealth
): boolean => {
  const isVolumeHealthy =
    volumeReplicationHealth === VolumeReplicationHealth.HEALTHY;
  const isKubeObjectHealthy =
    !kubeObjectReplicationHealth ||
    kubeObjectReplicationHealth === VolumeReplicationHealth.HEALTHY;

  return isVolumeHealthy && isKubeObjectHealthy;
};

/**
 * Checks if progression is still active (not completed).
 * Exported for use in dr-status-popover.
 */
export const isProgressionActive = (progression?: string): boolean =>
  !!progression && progression !== Progression.Completed;

/**
 * Checks if within sync threshold based on scheduling interval.
 */
const isWithinSyncThreshold = (
  actionStartTime?: string,
  schedulingInterval?: string
): boolean => {
  if (!actionStartTime || !schedulingInterval) return true;
  // No sync threshold applies when no replication is required (0m interval).
  if (schedulingInterval === '0m') return true;
  const elapsedSeconds = getTimeDifferenceInSeconds(actionStartTime);
  const [, slaDiff] = getVolumeReplicationHealth(
    elapsedSeconds,
    schedulingInterval
  );
  return slaDiff < THRESHOLD;
};

/**
 * Determines whether to show "Protecting" status.
 */
const shouldShowProtecting = (
  isCleanupRequired: boolean,
  phase: Phase,
  protectedCondition?: K8sResourceCondition,
  volumeLastGroupSyncTime?: string,
  actionStartTime?: string,
  schedulingInterval?: string
): boolean => {
  // Never show "Protecting" during cleanup or when condition is missing
  if (isCleanupRequired || !protectedCondition) {
    return false;
  }

  // If sync has started, protection is already established
  if (volumeLastGroupSyncTime) {
    return false;
  }

  const { status, reason } = protectedCondition;

  // Show "Protecting" during initial setup before sync starts
  const isStatusUnknown = status === K8sResourceConditionStatus.Unknown;
  const isReasonUnknown = reason === DRPlacementControlConditionReason.Unknown;
  const isProgressingWithoutSync =
    status === K8sResourceConditionStatus.False &&
    reason === DRPlacementControlConditionReason.Progressing;

  // Protection is shown when:
  // 1. Status is unknown (validating), OR
  // 2. Reason is unknown (undetermined), OR
  // 3. Protection is progressing but sync hasn't started
  if (isStatusUnknown || isReasonUnknown) {
    return true;
  }

  if (isProgressingWithoutSync) {
    // For Deployed, respect the 3x schedule interval window before falling to health
    if (phase === Phase.Deployed) {
      return isWithinSyncThreshold(actionStartTime, schedulingInterval);
    }
    return true;
  }

  return false;
};

/**
 * Determines whether to show "ProtectionError" status.
 */
export const shouldShowProtectionError = (
  protectedCondition?: K8sResourceCondition
): boolean => {
  if (!protectedCondition) return false;

  const { status, reason } = protectedCondition;

  // Only show error for Error reasons with actionable statuses
  return (
    reason === DRPlacementControlConditionReason.Error &&
    (status === K8sResourceConditionStatus.True ||
      status === K8sResourceConditionStatus.False)
  );
};

/**
 * Comprehensive DR status determination logic.
 * This is the authoritative implementation used by dr-status-popover.
 *
 * Priority order:
 * 1. User action requirements (WaitForUser) and deletion state
 * 2. Cleanup requirements (WaitOnUserToCleanUp), except Deleting/WaitForUser
 * 3. Active operations (FailingOver/Relocating)
 * 4. Completed operations (FailedOver/Relocated) with sync state
 * 5. Protection status (Protecting/ProtectionError)
 * 6. Replication health (Critical/Warning/Healthy)
 */
export const getDRStatus = ({
  phase,
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
  progression,
  volumeLastGroupSyncTime,
  protectedCondition,
  schedulingInterval,
  actionStartTime,
  action,
  dryRun,
  autoCleanupCondition,
}: {
  phase: Phase;
  volumeReplicationHealth?: VolumeReplicationHealth;
  kubeObjectReplicationHealth?: VolumeReplicationHealth;
  progression?: string;
  volumeLastGroupSyncTime?: string;
  protectedCondition?: K8sResourceCondition;
  schedulingInterval?: string;
  actionStartTime?: string;
  action?: DRActionType;
  dryRun?: boolean;
  autoCleanupCondition?: K8sResourceCondition;
}): DRStatus => {
  // WaitForUser / Deleting win over a stale WaitOnUserToCleanUp progression
  // (phase can change while progression has not yet advanced).
  if (phase === Phase.WaitForUser) return DRStatus.WaitForUser;
  if (phase === Phase.Deleting) return DRStatus.Deleting;

  const cleanupRequired = isCleanupRequired(progression, autoCleanupCondition);
  if (cleanupRequired) return DRStatus.WaitOnUserToCleanUp;

  // DryRun test failover in hold state — test workload is running on secondary.
  if (dryRun && progression === Progression.TestingFailover)
    return DRStatus.TestingFailover;

  // Handle failover or relocation phases directly
  if (phase === Phase.FailingOver) return DRStatus.FailingOver;
  if (phase === Phase.Relocating) return DRStatus.Relocating;

  // Map transitional phases to action-specific status when action is known.
  // During initial enrollment (no action), fall through to Protecting/health logic.
  if ((phase === Phase.Initiating || phase === Phase.Deploying) && action) {
    if (action === DRActionType.FAILOVER) return DRStatus.FailingOver;
    if (action === DRActionType.RELOCATE) return DRStatus.Relocating;
  }

  // Combine health statuses into an array for easier checks (filter out undefined)
  const replicationHealths: VolumeReplicationHealth[] = [
    ...(volumeReplicationHealth ? [volumeReplicationHealth] : []),
    ...(kubeObjectReplicationHealth ? [kubeObjectReplicationHealth] : []),
  ];
  const isProgressionCompleted = !isProgressionActive(progression);

  // For FailedOver/Relocated phases:
  // - If sync hasn't started yet, show completion message (phase status)
  // - If progression is still active, keep phase status
  // - Otherwise, fall through to protection/health evaluation
  // This check must come BEFORE "Protecting" status to ensure completion status
  // is shown immediately after failover/relocate completes, even if protectedCondition
  // is still in "Unknown" or "Progressing" state.
  const hasSyncStarted = !!volumeLastGroupSyncTime;
  // When schedulingInterval is 0m (e.g. FusionAccess), no replication occurs,
  // so sync will never start. Skip the hasSyncStarted gate for these policies.
  const isNoReplicationRequired = schedulingInterval === '0m';

  if (phase === Phase.FailedOver || phase === Phase.Relocated) {
    // If sync hasn't started yet and replication is expected, show completion message (phase status)
    if (!hasSyncStarted && !isNoReplicationRequired) {
      return phase === Phase.FailedOver
        ? DRStatus.FailedOver
        : DRStatus.Relocated;
    }

    // Once sync has started, check if progression is still active before showing health status
    // If progression is active (not Completed/undefined), show phase status to keep progression view visible
    if (isProgressionActive(progression)) {
      return phase === Phase.FailedOver
        ? DRStatus.FailedOver
        : DRStatus.Relocated;
    }
  }

  const shouldProtect = shouldShowProtecting(
    cleanupRequired,
    phase,
    protectedCondition,
    volumeLastGroupSyncTime,
    actionStartTime,
    schedulingInterval
  );
  // Check for protecting status while progression is active, or during Deployed
  // within the sync threshold window when protection is still progressing.
  // This should NOT apply to FailedOver/Relocated phases as they are handled above.
  // Also, if sync has started, we should NOT show "Protecting" - show health status instead.
  if (shouldProtect && (!isProgressionCompleted || phase === Phase.Deployed))
    return DRStatus.Protecting;

  // Surface protection errors during Deploying even if progression is active
  if (
    phase === Phase.Deploying &&
    shouldShowProtectionError(protectedCondition)
  )
    return DRStatus.ProtectionError;

  // Check for protection error after progression completes
  if (isProgressionCompleted && shouldShowProtectionError(protectedCondition))
    return DRStatus.ProtectionError;

  // For other phases, check health status
  // If any health status is CRITICAL, return Critical status immediately
  if (replicationHealths.includes(VolumeReplicationHealth.CRITICAL))
    return DRStatus.Critical;

  // If any health status is WARNING, return Warning status
  if (replicationHealths.includes(VolumeReplicationHealth.WARNING))
    return DRStatus.Warning;

  // If at least one status is HEALTHY (and none were critical or warning), return Healthy status
  if (replicationHealths.includes(VolumeReplicationHealth.HEALTHY))
    return DRStatus.Healthy;

  // No health data available — cannot determine status
  if (replicationHealths.length === 0) return DRStatus.Unknown;

  // Fallback — assume Critical if no health statuses matched
  return DRStatus.Critical;
};

/**
 * Utility: Check if application is currently failing over or relocating.
 */
export const isFailingOrRelocating = (
  status: DRStatus | Phase | string | undefined
): boolean => {
  if (!status) return false;
  const statusStr = String(status);
  return (
    status === DRStatus.FailingOver ||
    status === DRStatus.Relocating ||
    statusStr === Phase.FailingOver ||
    statusStr === Phase.Relocating
  );
};

export const isCleanupRequired = (
  progression?: Progression | string,
  autoCleanupCondition?: K8sResourceCondition
): boolean => {
  if (progression !== Progression.WaitOnUserToCleanUp) {
    return false;
  }

  const reason = autoCleanupCondition?.reason;
  const isHandledByAutoCleanup =
    autoCleanupCondition?.type === VRGConditionType.AutoCleanup &&
    autoCleanupCondition?.status === K8sResourceConditionStatus.True &&
    (reason === VRGConditionReason.Progressing ||
      reason === VRGConditionReason.Completed);

  return !isHandledByAutoCleanup;
};

/**
 * Utility: Check if user action is required.
 */
export const isUserActionRequired = (status: DRStatus): boolean =>
  status === DRStatus.WaitOnUserToCleanUp || status === DRStatus.WaitForUser;
