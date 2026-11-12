import { Patch } from '@openshift-console/dynamic-plugin-sdk';
import { DRActionType } from '../constants';
import { Progression } from '../types';

const DRY_RUN_PATH = '/spec/dryRun';

export const getStartTestFailoverPatch = (): Patch[] => [
  { op: 'add', path: DRY_RUN_PATH, value: true },
];

export const getPromoteTestFailoverPatch = (
  actionStartTime: string
): Patch[] => [
  { op: 'test', path: DRY_RUN_PATH, value: true },
  {
    op: 'test',
    path: '/status/progression',
    value: Progression.TestingFailover,
  },
  {
    op: 'test',
    path: '/status/actionStartTime',
    value: actionStartTime,
  },
  { op: 'replace', path: DRY_RUN_PATH, value: false },
];

// Restore the known production placement (homeCluster / peerCluster), not
// last-app-deployment-cluster. At the test hold that annotation can name the
// test cluster, which would turn clean up into a production move.
// lastAction still chooses Deployed / Failover / Relocate restore shape.
// actionStartTime binds this clean-up to the hold the UI showed.
export const getEndTestFailoverPatch = (
  homeCluster: string,
  actionStartTime: string,
  lastAction: string = '',
  peerCluster: string = ''
): Patch[] => {
  const clearDryRun: Patch[] = [
    { op: 'test', path: DRY_RUN_PATH, value: true },
    {
      op: 'test',
      path: '/status/progression',
      value: Progression.TestingFailover,
    },
    {
      op: 'test',
      path: '/status/actionStartTime',
      value: actionStartTime,
    },
    { op: 'replace', path: DRY_RUN_PATH, value: false },
  ];

  if (lastAction === DRActionType.FAILOVER) {
    const patches: Patch[] = [
      ...clearDryRun,
      { op: 'replace', path: '/spec/action', value: DRActionType.FAILOVER },
      {
        op: 'replace',
        path: '/spec/failoverCluster',
        value: homeCluster,
      },
    ];
    if (peerCluster && peerCluster !== homeCluster) {
      patches.push({
        op: 'add',
        path: '/spec/preferredCluster',
        value: peerCluster,
      });
    }
    return patches;
  }

  if (lastAction === DRActionType.RELOCATE) {
    return [
      ...clearDryRun,
      { op: 'replace', path: '/spec/action', value: DRActionType.RELOCATE },
      {
        op: 'add',
        path: '/spec/preferredCluster',
        value: homeCluster,
      },
      // Test start writes failoverCluster to the test target; Relocate does not
      // use it, so clear the leftover test value.
      { op: 'remove', path: '/spec/failoverCluster' },
    ];
  }

  // Deployed: drop the test Failover target and restore preferredCluster home.
  return [
    ...clearDryRun,
    { op: 'remove', path: '/spec/action' },
    { op: 'remove', path: '/spec/failoverCluster' },
    { op: 'add', path: '/spec/preferredCluster', value: homeCluster },
  ];
};
