/* eslint-disable import/no-extraneous-dependencies */
import { describe, expect, it } from '@jest/globals';
import {
  Phase,
  Progression,
  VRGConditionReason,
  VRGConditionType,
} from '@odf/mco/types';
import {
  K8sResourceCondition,
  K8sResourceConditionStatus,
} from '@odf/shared/types';
import { DRStatus, getDRStatus, isCleanupRequired } from './dr-status';

const autoCleanupCondition = (
  reason: VRGConditionReason,
  status: K8sResourceConditionStatus = K8sResourceConditionStatus.True
): K8sResourceCondition => ({
  type: VRGConditionType.AutoCleanup,
  status,
  reason,
});

describe('isCleanupRequired', () => {
  it('returns false when progression is not WaitOnUserToCleanUp', () => {
    expect(isCleanupRequired(Progression.Completed)).toBe(false);
  });

  it('returns true for WaitOnUserToCleanUp when AutoCleanup is absent', () => {
    expect(isCleanupRequired(Progression.WaitOnUserToCleanUp)).toBe(true);
  });

  it('returns true when AutoCleanup is NotFeasible', () => {
    expect(
      isCleanupRequired(
        Progression.WaitOnUserToCleanUp,
        autoCleanupCondition(
          VRGConditionReason.NotFeasible,
          K8sResourceConditionStatus.False
        )
      )
    ).toBe(true);
  });

  it('returns true when AutoCleanup is Unused', () => {
    expect(
      isCleanupRequired(
        Progression.WaitOnUserToCleanUp,
        autoCleanupCondition(
          VRGConditionReason.Unused,
          K8sResourceConditionStatus.False
        )
      )
    ).toBe(true);
  });

  it('returns false when AutoCleanup is Progressing', () => {
    expect(
      isCleanupRequired(
        Progression.WaitOnUserToCleanUp,
        autoCleanupCondition(VRGConditionReason.Progressing)
      )
    ).toBe(false);
  });

  it('returns false when AutoCleanup is Completed', () => {
    expect(
      isCleanupRequired(
        Progression.WaitOnUserToCleanUp,
        autoCleanupCondition(VRGConditionReason.Completed)
      )
    ).toBe(false);
  });

  it('returns true when AutoCleanup Progressing has a non-True status', () => {
    expect(
      isCleanupRequired(
        Progression.WaitOnUserToCleanUp,
        autoCleanupCondition(
          VRGConditionReason.Progressing,
          K8sResourceConditionStatus.False
        )
      )
    ).toBe(true);
  });

  it('returns true when a non-AutoCleanup condition has a Progressing reason', () => {
    expect(
      isCleanupRequired(Progression.WaitOnUserToCleanUp, {
        type: 'Protected',
        status: K8sResourceConditionStatus.True,
        reason: VRGConditionReason.Progressing,
      })
    ).toBe(true);
  });
});

describe('getDRStatus AutoCleanup', () => {
  it('shows Action needed for WaitOnUserToCleanUp without AutoCleanup', () => {
    expect(
      getDRStatus({
        phase: Phase.FailedOver,
        progression: Progression.WaitOnUserToCleanUp,
      })
    ).toBe(DRStatus.WaitOnUserToCleanUp);
  });

  it('does not show Action needed while AutoCleanup is Progressing', () => {
    expect(
      getDRStatus({
        phase: Phase.Relocating,
        progression: Progression.WaitOnUserToCleanUp,
        autoCleanupCondition: autoCleanupCondition(
          VRGConditionReason.Progressing
        ),
      })
    ).toBe(DRStatus.Relocating);
  });

  it('shows FailedOver while AutoCleanup is Progressing after failover', () => {
    expect(
      getDRStatus({
        phase: Phase.FailedOver,
        progression: Progression.WaitOnUserToCleanUp,
        autoCleanupCondition: autoCleanupCondition(
          VRGConditionReason.Progressing
        ),
      })
    ).toBe(DRStatus.FailedOver);
  });

  it('shows FailedOver when AutoCleanup is Completed', () => {
    expect(
      getDRStatus({
        phase: Phase.FailedOver,
        progression: Progression.WaitOnUserToCleanUp,
        autoCleanupCondition: autoCleanupCondition(
          VRGConditionReason.Completed
        ),
      })
    ).toBe(DRStatus.FailedOver);
  });

  it('shows Action needed when AutoCleanup is NotFeasible', () => {
    expect(
      getDRStatus({
        phase: Phase.Relocating,
        progression: Progression.WaitOnUserToCleanUp,
        autoCleanupCondition: autoCleanupCondition(
          VRGConditionReason.NotFeasible,
          K8sResourceConditionStatus.False
        ),
      })
    ).toBe(DRStatus.WaitOnUserToCleanUp);
  });

  it('prefers Deleting over a stale WaitOnUserToCleanUp progression', () => {
    expect(
      getDRStatus({
        phase: Phase.Deleting,
        progression: Progression.WaitOnUserToCleanUp,
      })
    ).toBe(DRStatus.Deleting);
  });

  it('prefers WaitForUser over a stale WaitOnUserToCleanUp progression', () => {
    expect(
      getDRStatus({
        phase: Phase.WaitForUser,
        progression: Progression.WaitOnUserToCleanUp,
      })
    ).toBe(DRStatus.WaitForUser);
  });
});
