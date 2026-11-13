import { DRActionType } from '../constants';
import { DRPlacementControlKind, Phase, Progression } from '../types';
import { isDiscoveredDRPC, isTestSyncLagging } from './disaster-recovery';
import { DRStatus, getDRStatus } from './dr-status';
import {
  getEndTestFailoverPatch,
  getPromoteTestFailoverPatch,
  getStartTestFailoverPatch,
} from './test-failover';

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

  it('converts the test to a real failover by clearing dryRun', () => {
    expect(getPromoteTestFailoverPatch('2024-01-01T00:00:00Z')).toEqual([
      { op: 'test', path: '/spec/dryRun', value: true },
      {
        op: 'test',
        path: '/status/progression',
        value: Progression.TestingFailover,
      },
      {
        op: 'test',
        path: '/status/actionStartTime',
        value: '2024-01-01T00:00:00Z',
      },
      { op: 'replace', path: '/spec/dryRun', value: false },
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

  it('ends a Deployed test by removing action', () => {
    expect(getEndTestFailoverPatch('east-1', '2024-01-01T00:00:00Z')).toEqual([
      { op: 'test', path: '/spec/dryRun', value: true },
      {
        op: 'test',
        path: '/status/progression',
        value: Progression.TestingFailover,
      },
      {
        op: 'test',
        path: '/status/actionStartTime',
        value: '2024-01-01T00:00:00Z',
      },
      { op: 'replace', path: '/spec/dryRun', value: false },
      { op: 'remove', path: '/spec/action' },
      { op: 'remove', path: '/spec/failoverCluster' },
      { op: 'add', path: '/spec/preferredCluster', value: 'east-1' },
    ]);
  });

  it('ends a FailedOver test by restoring Failover onto the production cluster', () => {
    expect(
      getEndTestFailoverPatch(
        'west-1',
        '2024-01-01T00:00:00Z',
        DRActionType.FAILOVER,
        'east-1'
      )
    ).toEqual([
      { op: 'test', path: '/spec/dryRun', value: true },
      {
        op: 'test',
        path: '/status/progression',
        value: Progression.TestingFailover,
      },
      {
        op: 'test',
        path: '/status/actionStartTime',
        value: '2024-01-01T00:00:00Z',
      },
      { op: 'replace', path: '/spec/dryRun', value: false },
      { op: 'replace', path: '/spec/action', value: DRActionType.FAILOVER },
      { op: 'replace', path: '/spec/failoverCluster', value: 'west-1' },
      { op: 'add', path: '/spec/preferredCluster', value: 'east-1' },
    ]);
  });

  it('skips preferredCluster when the peer matches the restored failover cluster', () => {
    expect(
      getEndTestFailoverPatch(
        'west-1',
        '2024-01-01T00:00:00Z',
        DRActionType.FAILOVER,
        'west-1'
      )
    ).toEqual([
      { op: 'test', path: '/spec/dryRun', value: true },
      {
        op: 'test',
        path: '/status/progression',
        value: Progression.TestingFailover,
      },
      {
        op: 'test',
        path: '/status/actionStartTime',
        value: '2024-01-01T00:00:00Z',
      },
      { op: 'replace', path: '/spec/dryRun', value: false },
      { op: 'replace', path: '/spec/action', value: DRActionType.FAILOVER },
      { op: 'replace', path: '/spec/failoverCluster', value: 'west-1' },
    ]);
  });

  it('ends a Relocated test by restoring Relocate onto the production cluster', () => {
    expect(
      getEndTestFailoverPatch(
        'east-1',
        '2024-01-01T00:00:00Z',
        DRActionType.RELOCATE
      )
    ).toEqual([
      { op: 'test', path: '/spec/dryRun', value: true },
      {
        op: 'test',
        path: '/status/progression',
        value: Progression.TestingFailover,
      },
      {
        op: 'test',
        path: '/status/actionStartTime',
        value: '2024-01-01T00:00:00Z',
      },
      { op: 'replace', path: '/spec/dryRun', value: false },
      { op: 'replace', path: '/spec/action', value: DRActionType.RELOCATE },
      { op: 'add', path: '/spec/preferredCluster', value: 'east-1' },
      { op: 'remove', path: '/spec/failoverCluster' },
    ]);
  });

  it('treats a recent sync as ready and ignores policies with no interval', () => {
    expect(isTestSyncLagging('2020-01-01T00:00:00Z', '')).toBe(false);
    expect(isTestSyncLagging('2020-01-01T00:00:00Z', '0m')).toBe(false);
    expect(
      isTestSyncLagging(new Date(Date.now() - 1000).toISOString(), '5m')
    ).toBe(false);
  });

  // Async policies expect a sync. No lastGroupSyncTime yet means the dry-run
  // is still blocked, same as a sync older than 3x the interval.
  it('pauses the test when sync is missing or older than 3 intervals', () => {
    expect(isTestSyncLagging(undefined, '5m')).toBe(true);
    expect(isTestSyncLagging('2020-01-01T00:00:00Z', '5m')).toBe(true);
  });

  it('detects discovered applications from the protected namespaces', () => {
    const drpc = getDRPC();
    expect(isDiscoveredDRPC(drpc)).toBe(false);
    drpc.spec.protectedNamespaces = ['app-ns'];
    expect(isDiscoveredDRPC(drpc)).toBe(true);
  });
});
