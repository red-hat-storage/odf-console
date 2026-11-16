import { DRActionType, TEST_FAILOVER_DRYRUN_ANNOTATION } from '../constants';
import { DRPlacementControlKind, Phase, Progression } from '../types';
import { drpcHasVolumes, isTestSyncLagging } from './disaster-recovery';
import { DRStatus, getDRStatus } from './dr-status';
import {
  getEndTestFailoverPatch,
  getPromoteTestFailoverPatch,
  isRevertingTestFailover,
  isTestFailoverInProgress,
} from './test-failover';

const START = '2024-01-01T00:00:00Z';

const clearDryRun = [
  { op: 'test', path: '/spec/dryRun', value: true },
  {
    op: 'test',
    path: '/status/progression',
    value: Progression.TestingFailover,
  },
  { op: 'test', path: '/status/actionStartTime', value: START },
  { op: 'replace', path: '/spec/dryRun', value: false },
];

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
  it('covers promote, hold status, and revert detection', () => {
    expect(getPromoteTestFailoverPatch(START)).toEqual([
      ...clearDryRun.slice(0, 3),
      { op: 'replace', path: '/spec/dryRun', value: false },
    ]);

    expect(
      getDRStatus({
        phase: Phase.FailedOver,
        progression: Progression.TestingFailover,
        dryRun: true,
        hasTestFailoverAnnotation: true,
      })
    ).toBe(DRStatus.TestFailoverActionRequired);
    expect(
      getDRStatus({
        phase: Phase.FailedOver,
        progression: Progression.TestingFailover,
        dryRun: false,
        hasTestFailoverAnnotation: true,
        isRevertingTestFailover: false,
      })
    ).toBe(DRStatus.TestFailoverActionRequired);
    expect(
      getDRStatus({
        phase: Phase.FailedOver,
        progression: Progression.TestingFailover,
        dryRun: false,
        hasTestFailoverAnnotation: true,
        isRevertingTestFailover: true,
      })
    ).toBe(DRStatus.CleaningUp);

    const base = getDRPC();
    base.spec.dryRun = false;
    base.metadata.annotations = {
      [TEST_FAILOVER_DRYRUN_ANNOTATION]: 'true',
      'drplacementcontrol.ramendr.openshift.io/last-app-deployment-cluster':
        'east-1',
    };
    expect(
      isRevertingTestFailover({
        ...base,
        spec: {
          ...base.spec,
          action: DRActionType.FAILOVER,
          failoverCluster: 'west-1',
        },
      })
    ).toBe(false);
    expect(
      isRevertingTestFailover({
        ...base,
        spec: {
          ...base.spec,
          action: DRActionType.FAILOVER,
          failoverCluster: 'east-1',
        },
      })
    ).toBe(true);
  });

  it('builds end patches and refuses unsafe last-action', () => {
    expect(
      getEndTestFailoverPatch({
        homeCluster: 'east-1',
        actionStartTime: START,
        lastAction: '',
      })
    ).toEqual([
      ...clearDryRun,
      { op: 'remove', path: '/spec/action' },
      { op: 'remove', path: '/spec/failoverCluster' },
      { op: 'add', path: '/spec/preferredCluster', value: 'east-1' },
    ]);
    expect(
      getEndTestFailoverPatch({
        homeCluster: 'west-1',
        actionStartTime: START,
        lastAction: DRActionType.FAILOVER,
        peerCluster: 'east-1',
      })
    ).toEqual([
      ...clearDryRun,
      { op: 'replace', path: '/spec/action', value: DRActionType.FAILOVER },
      { op: 'replace', path: '/spec/failoverCluster', value: 'west-1' },
      { op: 'add', path: '/spec/preferredCluster', value: 'east-1' },
    ]);
    expect(
      getEndTestFailoverPatch({
        homeCluster: 'east-1',
        actionStartTime: START,
        lastAction: DRActionType.RELOCATE,
        currentFailoverCluster: 'west-1',
      })
    ).toEqual([
      ...clearDryRun,
      { op: 'replace', path: '/spec/action', value: DRActionType.RELOCATE },
      { op: 'add', path: '/spec/preferredCluster', value: 'east-1' },
      { op: 'remove', path: '/spec/failoverCluster' },
    ]);
    expect(
      getEndTestFailoverPatch({
        homeCluster: 'east-1',
        actionStartTime: START,
        lastAction: undefined,
      })
    ).toBeNull();
    expect(
      getEndTestFailoverPatch({
        homeCluster: 'west-1',
        actionStartTime: START,
        lastAction: DRActionType.FAILOVER,
        peerCluster: '',
      })
    ).toBeNull();
  });

  it('covers lag, volumes, and in-progress detection', () => {
    expect(isTestSyncLagging(undefined, '5m')).toBe(true);
    expect(isTestSyncLagging(undefined, '5m', false)).toBe(false);
    expect(isTestSyncLagging('2020-01-01T00:00:00Z', '0m')).toBe(false);
    expect(
      drpcHasVolumes({
        spec: { drPolicyRef: { name: 'p' }, pvcSelector: {} },
      } as DRPlacementControlKind)
    ).toBe(false);
    expect(
      getDRStatus({
        phase: Phase.FailedOver,
        progression: 'FailingOverToCluster',
        dryRun: true,
        schedulingInterval: '5m',
        hasVolumes: false,
      })
    ).toBe(DRStatus.TestingFailover);

    expect(isTestFailoverInProgress(getDRPC())).toBe(true);
    const bareWait: DRPlacementControlKind = {
      ...getDRPC(),
      spec: { drPolicyRef: { name: 'policy' }, pvcSelector: {} },
      status: {
        phase: Phase.FailedOver,
        progression: Progression.WaitOnUserToCleanUp,
      },
    };
    expect(isTestFailoverInProgress(bareWait)).toBe(false);
    bareWait.metadata.annotations = {
      [TEST_FAILOVER_DRYRUN_ANNOTATION]: 'true',
    };
    expect(isTestFailoverInProgress(bareWait)).toBe(true);
  });
});
