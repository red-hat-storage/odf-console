import { Phase, Progression } from '@odf/mco/types';
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
});
