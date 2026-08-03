import { getResourceCondition, isConditionStatus } from '@odf/shared/selectors';
import { K8sResourceConditionStatus } from '@odf/shared/types';
import {
  MirrorPeerConditionReason,
  MirrorPeerConditionType,
  MirrorPeerPairingStatus,
  MirrorPeerPhase,
  MirrorPeerPhaseMessage,
  MIRROR_PEER_IN_PROGRESS_REASONS,
} from '../constants';
import { MirrorPeerKind } from '../types';

export const getMirrorPeerPhase = (
  mirrorPeer?: MirrorPeerKind
): MirrorPeerPhase | undefined => {
  const phase = mirrorPeer?.status?.phase;
  if (!phase) {
    return undefined;
  }
  return Object.values(MirrorPeerPhase).includes(phase) ? phase : undefined;
};

export const getMirrorPeerMessage = (mirrorPeer?: MirrorPeerKind): string =>
  mirrorPeer?.status?.message || '';

const MIRROR_PEER_FAILURE_REASON_MESSAGES: Readonly<
  Partial<Record<string, string>>
> = {
  [MirrorPeerConditionReason.ValidationFailed]:
    MirrorPeerPhaseMessage.ValidationFailed,
  [MirrorPeerConditionReason.ConfigurationFailed]:
    MirrorPeerPhaseMessage.ConfigurationFailed,
  [MirrorPeerConditionReason.ManagedClusterAddonFailed]:
    MirrorPeerPhaseMessage.ManagedClusterAddOnFailed,
  [MirrorPeerConditionReason.PeeringFailed]:
    MirrorPeerPhaseMessage.PeeringFailed,
  [MirrorPeerConditionReason.S3ConfigurationFailed]:
    MirrorPeerPhaseMessage.S3ConfigurationFailed,
  [MirrorPeerConditionReason.DRClusterConfigurationFailed]:
    MirrorPeerPhaseMessage.DRClusterConfigurationFailed,
  [MirrorPeerConditionReason.DeletionFailed]:
    MirrorPeerPhaseMessage.DeletionFailed,
};

const conditionMatchesStatusMessage = (
  reason: string | undefined,
  statusMessage: string
): boolean =>
  !!reason &&
  !!statusMessage &&
  MIRROR_PEER_FAILURE_REASON_MESSAGES[reason] === statusMessage;

export const getMirrorPeerPrimaryCondition = (mirrorPeer?: MirrorPeerKind) => {
  if (!mirrorPeer) {
    return undefined;
  }
  const configured = getResourceCondition(
    mirrorPeer,
    MirrorPeerConditionType.Configured
  );
  const validated = getResourceCondition(
    mirrorPeer,
    MirrorPeerConditionType.Validated
  );
  const deleted = getResourceCondition(
    mirrorPeer,
    MirrorPeerConditionType.Deleted
  );
  const ordered = [validated, configured, deleted].filter(Boolean);
  const failedConditions = ordered.filter((condition) =>
    isConditionStatus(condition, K8sResourceConditionStatus.False)
  );
  if (failedConditions.length === 0) {
    return ordered[0];
  }
  if (failedConditions.length === 1) {
    return failedConditions[0];
  }
  const statusMessage = getMirrorPeerMessage(mirrorPeer);
  const matched = failedConditions.find((condition) =>
    conditionMatchesStatusMessage(condition?.reason, statusMessage)
  );
  return matched || failedConditions[failedConditions.length - 1];
};

const hasRecoverableFailure = (mirrorPeer?: MirrorPeerKind): boolean => {
  if (
    getMirrorPeerPhase(mirrorPeer) === MirrorPeerPhase.Deleting &&
    (getMirrorPeerMessage(mirrorPeer) ===
      MirrorPeerPhaseMessage.DeletionFailed ||
      getMirrorPeerPrimaryCondition(mirrorPeer)?.reason ===
        MirrorPeerConditionReason.DeletionFailed)
  ) {
    return true;
  }

  const condition = getMirrorPeerPrimaryCondition(mirrorPeer);
  return (
    isConditionStatus(condition, K8sResourceConditionStatus.False) &&
    !!condition?.reason &&
    !MIRROR_PEER_IN_PROGRESS_REASONS.has(condition.reason)
  );
};

export const getMirrorPeerPairingStatus = (
  mirrorPeer?: MirrorPeerKind
): MirrorPeerPairingStatus => {
  const phase = getMirrorPeerPhase(mirrorPeer);

  if (phase === MirrorPeerPhase.Ready) {
    return MirrorPeerPairingStatus.Ready;
  }
  if (phase === MirrorPeerPhase.Failed) {
    return MirrorPeerPairingStatus.FailedUnrecoverable;
  }
  if (hasRecoverableFailure(mirrorPeer)) {
    return MirrorPeerPairingStatus.FailedRecoverable;
  }
  return MirrorPeerPairingStatus.Progressing;
};

export const isMirrorPeerReady = (mirrorPeer?: MirrorPeerKind): boolean =>
  getMirrorPeerPairingStatus(mirrorPeer) === MirrorPeerPairingStatus.Ready;

const MIRROR_PEER_UI_PROGRESS_MILESTONES = [0, 25, 50, 100] as const;

export const getMirrorPeerProgressValue = (
  mirrorPeer?: MirrorPeerKind,
  fallbackPhase?: MirrorPeerPhase
): number => {
  const phase = getMirrorPeerPhase(mirrorPeer);
  const effectivePhase: MirrorPeerPhase =
    !phase || phase === MirrorPeerPhase.Failed
      ? fallbackPhase && fallbackPhase !== MirrorPeerPhase.Failed
        ? fallbackPhase
        : MirrorPeerPhase.Initializing
      : phase;

  switch (effectivePhase) {
    case MirrorPeerPhase.Ready:
    case MirrorPeerPhase.Deleting:
      return 100;
    case MirrorPeerPhase.Configuring:
      return 50;
    case MirrorPeerPhase.Initializing:
    default:
      return 25;
  }
};

export const getNextMirrorPeerProgressMilestone = (
  displayed: number,
  target: number,
  milestones: readonly number[] = MIRROR_PEER_UI_PROGRESS_MILESTONES
): number => {
  if (displayed >= target) {
    return displayed;
  }
  const next = milestones.find(
    (milestone) => milestone > displayed && milestone <= target
  );
  return next ?? target;
};
