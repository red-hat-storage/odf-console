import { DRActionType } from '../constants';
import { DRPlacementControlKind, Phase, Progression } from '../types';
import { isDiscoveredDRPC, isTestSyncLagging } from './disaster-recovery';
import { DRStatus, getDRStatus } from './dr-status';
import { getStartTestFailoverPatch } from './test-failover';

const getDRPC = (): DRPlacementControlKind => ({
  metadata: { name: 'drpc', namespace: 'app-ns' },
  spec: {
    drPolicyRef: { name: 'policy' },
    pvcSelector: {},
    action: DRActionType.FAILOVER,
    failoverCluster: 'west-1',
    preferredCluster: 'east-1',
    dryRun: true,
  },
  status: { phase: Phase.FailedOver },
});

describe('Test failover utils', () => {
  it('starts the test by adding spec.dryRun', () => {
    expect(getStartTestFailoverPatch()).toEqual([
      { op: 'add', path: '/spec/dryRun', value: true },
    ]);
  });

  // Clean up clears spec.dryRun while phase is still FailedOver and
  // progression is still TestingFailover. That gap must stay the test hold.
  it('does not report Failover complete while the test progression is still set', () => {
    expect(
      getDRStatus({
        phase: Phase.FailedOver,
        progression: Progression.TestingFailover,
        dryRun: false,
      })
    ).toBe(DRStatus.TestFailoverActionRequired);
  });

  it('treats a missing or recent sync as ready to continue', () => {
    expect(isTestSyncLagging(undefined, '5m')).toBe(false);
    expect(isTestSyncLagging('2020-01-01T00:00:00Z', '')).toBe(false);
    expect(isTestSyncLagging('2020-01-01T00:00:00Z', '0m')).toBe(false);
    expect(
      isTestSyncLagging(new Date(Date.now() - 1000).toISOString(), '5m')
    ).toBe(false);
  });

  // Ramen holds a dry run until lastGroupSyncTime is within 3x the scheduling interval.
  it('pauses the test when the last sync is older than 3 intervals', () => {
    expect(isTestSyncLagging('2020-01-01T00:00:00Z', '5m')).toBe(true);
  });

  it('detects discovered applications from the protected namespaces', () => {
    const drpc = getDRPC();
    expect(isDiscoveredDRPC(drpc)).toBe(false);
    drpc.spec.protectedNamespaces = ['app-ns'];
    expect(isDiscoveredDRPC(drpc)).toBe(true);
  });
});
