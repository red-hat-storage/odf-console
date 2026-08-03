import {
  MirrorPeerConditionReason,
  MirrorPeerConditionType,
  MirrorPeerPairingStatus,
  MirrorPeerPhase,
  MirrorPeerPhaseMessage,
} from '@odf/mco/constants';
import { MirrorPeerKind } from '@odf/mco/types';
import {
  getMirrorPeerPairingStatus,
  getMirrorPeerPhase,
  getMirrorPeerPrimaryCondition,
  getMirrorPeerProgressValue,
  getNextMirrorPeerProgressMilestone,
  isMirrorPeerReady,
} from './mirrorpeer-status';

const peer = (phase?: MirrorPeerPhase, message?: string): MirrorPeerKind =>
  ({
    metadata: { name: 'mirrorpeer-test' },
    status: phase || message ? { phase, message } : undefined,
  }) as MirrorPeerKind;

describe('mirrorpeer-status', () => {
  it('maps phase to a single MirrorPeerPairingStatus', () => {
    expect(getMirrorPeerPairingStatus(peer(MirrorPeerPhase.Ready))).toBe(
      MirrorPeerPairingStatus.Ready
    );
    expect(getMirrorPeerPairingStatus(peer(MirrorPeerPhase.Failed))).toBe(
      MirrorPeerPairingStatus.FailedUnrecoverable
    );
    expect(getMirrorPeerPairingStatus(peer(MirrorPeerPhase.Configuring))).toBe(
      MirrorPeerPairingStatus.Progressing
    );
    expect(getMirrorPeerPairingStatus(peer())).toBe(
      MirrorPeerPairingStatus.Progressing
    );
  });

  it('keeps a failure status.message without a failed condition as Progressing', () => {
    expect(
      getMirrorPeerPairingStatus(
        peer(
          MirrorPeerPhase.Configuring,
          MirrorPeerPhaseMessage.ConfigurationFailed
        )
      )
    ).toBe(MirrorPeerPairingStatus.Progressing);
    expect(
      getMirrorPeerPairingStatus(
        peer(
          MirrorPeerPhase.Initializing,
          MirrorPeerPhaseMessage.ValidationFailed
        )
      )
    ).toBe(MirrorPeerPairingStatus.Progressing);
  });

  it('keeps the API phase when a configuration failure is being retried', () => {
    const configuringFailure = {
      metadata: { name: 'mirrorpeer-test' },
      status: {
        phase: MirrorPeerPhase.Configuring,
        message: MirrorPeerPhaseMessage.ConfigurationFailed,
        conditions: [
          {
            type: MirrorPeerConditionType.Configured,
            status: 'False',
            reason: MirrorPeerConditionReason.ConfigurationFailed,
            message: 'configuration error',
          },
        ],
      },
    } as MirrorPeerKind;

    expect(getMirrorPeerPhase(configuringFailure)).toBe(
      MirrorPeerPhase.Configuring
    );
    expect(getMirrorPeerPairingStatus(configuringFailure)).toBe(
      MirrorPeerPairingStatus.FailedRecoverable
    );
  });

  it('aligns primary failed condition with status.message when both are False', () => {
    const flapPeer = {
      metadata: { name: 'mirrorpeer-test' },
      status: {
        phase: MirrorPeerPhase.Configuring,
        message: MirrorPeerPhaseMessage.ValidationFailed,
        conditions: [
          {
            type: MirrorPeerConditionType.Validated,
            status: 'False',
            reason: MirrorPeerConditionReason.ValidationFailed,
            message: 'validation error',
          },
          {
            type: MirrorPeerConditionType.Configured,
            status: 'False',
            reason: MirrorPeerConditionReason.ConfigurationFailed,
            message: 'configuration error',
          },
        ],
      },
    } as MirrorPeerKind;

    expect(getMirrorPeerPrimaryCondition(flapPeer)?.reason).toBe(
      MirrorPeerConditionReason.ValidationFailed
    );

    flapPeer.status.message = MirrorPeerPhaseMessage.ConfigurationFailed;
    expect(getMirrorPeerPrimaryCondition(flapPeer)?.reason).toBe(
      MirrorPeerConditionReason.ConfigurationFailed
    );

    flapPeer.status.message = MirrorPeerPhaseMessage.PeeringFailed;
    flapPeer.status.conditions[1].reason =
      MirrorPeerConditionReason.PeeringFailed;
    expect(getMirrorPeerPrimaryCondition(flapPeer)?.reason).toBe(
      MirrorPeerConditionReason.PeeringFailed
    );
  });

  it('keeps isMirrorPeerReady aligned with pairing status', () => {
    expect(isMirrorPeerReady(peer(MirrorPeerPhase.Ready))).toBe(true);
    expect(getMirrorPeerPairingStatus(peer(MirrorPeerPhase.Failed))).toBe(
      MirrorPeerPairingStatus.FailedUnrecoverable
    );
    expect(getMirrorPeerPairingStatus(peer(MirrorPeerPhase.Configuring))).toBe(
      MirrorPeerPairingStatus.Progressing
    );
    expect(getMirrorPeerPairingStatus(peer())).toBe(
      MirrorPeerPairingStatus.Progressing
    );
  });

  it('treats Deleting + Deletion failed as FailedRecoverable', () => {
    const deletingFailed = peer(
      MirrorPeerPhase.Deleting,
      MirrorPeerPhaseMessage.DeletionFailed
    );
    expect(getMirrorPeerPairingStatus(deletingFailed)).toBe(
      MirrorPeerPairingStatus.FailedRecoverable
    );
    expect(getMirrorPeerProgressValue(deletingFailed)).toBe(100);
  });

  it('keeps healthy Deleting as Progressing', () => {
    const deleting = peer(
      MirrorPeerPhase.Deleting,
      MirrorPeerPhaseMessage.DeletionInProgress
    );
    expect(getMirrorPeerPairingStatus(deleting)).toBe(
      MirrorPeerPairingStatus.Progressing
    );
    expect(getMirrorPeerProgressValue(deleting)).toBe(100);
  });

  it('maps recoverable False conditions to FailedRecoverable', () => {
    const recoverable = {
      metadata: { name: 'mirrorpeer-test' },
      status: {
        phase: MirrorPeerPhase.Configuring,
        message: MirrorPeerPhaseMessage.PeeringFailed,
        conditions: [
          {
            type: MirrorPeerConditionType.Configured,
            status: 'False',
            reason: MirrorPeerConditionReason.PeeringFailed,
            message: 'StorageClusterPeer is Failed',
          },
        ],
      },
    } as MirrorPeerKind;
    expect(getMirrorPeerPairingStatus(recoverable)).toBe(
      MirrorPeerPairingStatus.FailedRecoverable
    );
    expect(getMirrorPeerProgressValue(recoverable)).toBe(50);
  });

  it('keeps PeeringInProgress False condition as Progressing', () => {
    const inProgress = {
      metadata: { name: 'mirrorpeer-test' },
      status: {
        phase: MirrorPeerPhase.Configuring,
        message: MirrorPeerPhaseMessage.PeeringInProgress,
        conditions: [
          {
            type: MirrorPeerConditionType.Configured,
            status: 'False',
            reason: MirrorPeerConditionReason.PeeringInProgress,
            message: 'Peering not yet completed',
          },
        ],
      },
    } as MirrorPeerKind;
    expect(getMirrorPeerPairingStatus(inProgress)).toBe(
      MirrorPeerPairingStatus.Progressing
    );
    expect(getMirrorPeerProgressValue(inProgress)).toBe(50);
  });

  it('maps create-flow phases to UI progress milestones (not messages)', () => {
    expect(getMirrorPeerProgressValue(peer(MirrorPeerPhase.Initializing))).toBe(
      25
    );
    expect(getMirrorPeerProgressValue(peer(MirrorPeerPhase.Configuring))).toBe(
      50
    );
    expect(getMirrorPeerProgressValue(peer(MirrorPeerPhase.Ready))).toBe(100);
    expect(getMirrorPeerProgressValue(peer(MirrorPeerPhase.Deleting))).toBe(
      100
    );
    expect(
      getMirrorPeerProgressValue(
        peer(
          MirrorPeerPhase.Configuring,
          MirrorPeerPhaseMessage.PeeringInProgress
        )
      )
    ).toBe(50);
    expect(
      getMirrorPeerProgressValue(
        peer(
          MirrorPeerPhase.Configuring,
          MirrorPeerPhaseMessage.S3ConfigurationInProgress
        )
      )
    ).toBe(50);
  });

  it('uses fallbackPhase when phase is Failed (configuration failed keeps Configuring %)', () => {
    expect(
      getMirrorPeerProgressValue(
        peer(MirrorPeerPhase.Failed),
        MirrorPeerPhase.Configuring
      )
    ).toBe(50);
    expect(
      getMirrorPeerProgressValue(
        peer(MirrorPeerPhase.Failed),
        MirrorPeerPhase.Initializing
      )
    ).toBe(25);
    expect(getMirrorPeerProgressValue(peer(MirrorPeerPhase.Failed))).toBe(25);
  });

  it('steps displayed progress through UI milestones toward the target', () => {
    expect(getNextMirrorPeerProgressMilestone(0, 50)).toBe(25);
    expect(getNextMirrorPeerProgressMilestone(25, 50)).toBe(50);
    expect(getNextMirrorPeerProgressMilestone(50, 100)).toBe(100);
    expect(getNextMirrorPeerProgressMilestone(0, 100)).toBe(25);
    expect(getNextMirrorPeerProgressMilestone(50, 50)).toBe(50);
    expect(getNextMirrorPeerProgressMilestone(100, 50)).toBe(100);
  });
});
