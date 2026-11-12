import { Phase, Progression } from '@odf/mco/types';
import { DRPlacementControlConditionReason } from '@odf/mco/types/ramen';
import { K8sResourceConditionStatus } from '@odf/shared/types';
import { selectSubscriptionDRStatus } from './subscription-parser';

describe('selectSubscriptionDRStatus', () => {
  const preparing = {
    name: 'preparing',
    phase: Phase.FailingOver,
    dryRun: true,
    progression: 'CheckingFailoverPrerequisites',
  };
  const waiting = {
    name: 'waiting',
    phase: Phase.FailedOver,
    dryRun: true,
    progression: Progression.TestingFailover,
  };
  const failingOver = {
    name: 'failing-over',
    phase: Phase.FailingOver,
    progression: 'FailingOverToCluster',
  };

  it('prefers the group waiting on the user over one that is still preparing', () => {
    expect(selectSubscriptionDRStatus([preparing, waiting])?.name).toBe(
      'waiting'
    );
  });

  it('keeps the first group when none is in an operation', () => {
    const deployed = { name: 'deployed', phase: Phase.Deployed };
    expect(
      selectSubscriptionDRStatus([deployed, { name: 'other' }])?.name
    ).toBe('deployed');
  });

  it('prefers a real failover over a test that is still preparing', () => {
    expect(selectSubscriptionDRStatus([preparing, failingOver])?.name).toBe(
      'failing-over'
    );
  });

  it('prefers a real failover over a deleting test that still shows TestingFailover', () => {
    const deleting = {
      name: 'deleting',
      phase: Phase.Deleting,
      dryRun: true,
      progression: Progression.TestingFailover,
    };
    expect(selectSubscriptionDRStatus([deleting, failingOver])?.name).toBe(
      'failing-over'
    );
  });

  it('prefers a real failover over a test whose dryRun was already cleared', () => {
    const endedTest = {
      name: 'ended-test',
      phase: Phase.FailedOver,
      dryRun: false,
      progression: Progression.TestingFailover,
    };
    expect(selectSubscriptionDRStatus([endedTest, failingOver])?.name).toBe(
      'failing-over'
    );
  });

  it('prefers a post-clean-up TestingFailover hold over an idle group', () => {
    const endedTest = {
      name: 'ended-test',
      phase: Phase.FailedOver,
      dryRun: false,
      progression: Progression.TestingFailover,
    };
    const deployed = { name: 'deployed', phase: Phase.Deployed };
    expect(selectSubscriptionDRStatus([deployed, endedTest])?.name).toBe(
      'ended-test'
    );
  });

  it('prefers WaitOnUserToCleanUp over an active test hold', () => {
    const needsCleanup = {
      name: 'needs-cleanup',
      phase: Phase.FailedOver,
      progression: Progression.WaitOnUserToCleanUp,
    };
    expect(selectSubscriptionDRStatus([waiting, needsCleanup])?.name).toBe(
      'needs-cleanup'
    );
  });

  it('prefers WaitForUser over an active test hold', () => {
    const waitForUser = {
      name: 'wait-for-user',
      phase: Phase.WaitForUser,
    };
    expect(selectSubscriptionDRStatus([waiting, waitForUser])?.name).toBe(
      'wait-for-user'
    );
  });

  it('prefers an active test hold over a live failover', () => {
    expect(selectSubscriptionDRStatus([failingOver, waiting])?.name).toBe(
      'waiting'
    );
  });

  it('prefers WaitOnUserToCleanUp over a live failover', () => {
    const needsCleanup = {
      name: 'needs-cleanup',
      phase: Phase.FailedOver,
      progression: Progression.WaitOnUserToCleanUp,
    };
    expect(selectSubscriptionDRStatus([failingOver, needsCleanup])?.name).toBe(
      'needs-cleanup'
    );
  });

  it('prefers a deployed protection error over an active dry-run test', () => {
    const protectionError = {
      name: 'protection-error',
      phase: Phase.Deployed,
      protectedCondition: {
        type: 'Protected',
        status: K8sResourceConditionStatus.True,
        reason: DRPlacementControlConditionReason.Error,
      },
    };
    expect(selectSubscriptionDRStatus([protectionError, waiting])?.name).toBe(
      'protection-error'
    );
    expect(
      selectSubscriptionDRStatus([waiting, protectionError])?.protectedCondition
        ?.reason
    ).toBe(DRPlacementControlConditionReason.Error);
  });
});
