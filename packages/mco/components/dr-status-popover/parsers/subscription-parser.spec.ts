import { DRActionType } from '@odf/mco/constants';
import { Phase, Progression } from '@odf/mco/types';
import { DRPlacementControlConditionReason } from '@odf/mco/types/ramen';
import { K8sResourceConditionStatus } from '@odf/shared/types';
import { selectSubscriptionDRStatus } from './subscription-parser';

describe('selectSubscriptionDRStatus', () => {
  const failingOver = {
    name: 'failing-over',
    phase: Phase.FailingOver,
    progression: 'FailingOverToCluster',
  };
  const protectionError = {
    name: 'protection-error',
    phase: Phase.Deployed,
    protectedCondition: {
      type: 'Protected',
      status: K8sResourceConditionStatus.True,
      reason: DRPlacementControlConditionReason.Error,
    },
  };

  it('ranks user cleanup above live failover, and live failover above protection errors', () => {
    const needsCleanup = {
      name: 'needs-cleanup',
      phase: Phase.FailedOver,
      progression: Progression.WaitOnUserToCleanUp,
    };
    expect(selectSubscriptionDRStatus([failingOver, needsCleanup])?.name).toBe(
      'needs-cleanup'
    );
    expect(
      selectSubscriptionDRStatus([protectionError, failingOver])?.name
    ).toBe('failing-over');
  });

  it('ranks Initiating failover as a live operation above protection errors', () => {
    const initiating = {
      name: 'initiating-fo',
      phase: Phase.Initiating,
      action: DRActionType.FAILOVER,
    };
    expect(
      selectSubscriptionDRStatus([protectionError, initiating])?.name
    ).toBe('initiating-fo');
  });

  it('ranks managed test cleanup above an idle group', () => {
    const idle = {
      name: 'idle',
      phase: Phase.Deployed,
      progression: Progression.Completed,
    };
    const testCleanup = {
      name: 'test-cleanup',
      phase: Phase.FailedOver,
      progression: Progression.CleaningUp,
      dryRun: false,
      isRevertingTestFailover: true,
    };
    expect(selectSubscriptionDRStatus([idle, testCleanup])?.name).toBe(
      'test-cleanup'
    );
  });
});
