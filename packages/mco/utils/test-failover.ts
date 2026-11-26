import { getAnnotations } from '@odf/shared/selectors';
import { Patch } from '@openshift-console/dynamic-plugin-sdk';
import {
  DRActionType,
  LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION,
  TEST_FAILOVER_DRYRUN_ANNOTATION,
} from '../constants';
import { DRPlacementControlKind, Progression } from '../types';

const DRY_RUN_PATH = '/spec/dryRun';

// Confirm clears dryRun on the server before the console watch returns that
// change. Remember the session so the hold does not offer Convert / Clean up
// again while the watched DRPC still says dryRun.
const clearedDryRunSessions = new Set<string>();

const testSessionKey = (
  namespace?: string,
  name?: string,
  actionStartTime?: string
): string =>
  namespace && name && actionStartTime
    ? `${namespace}/${name}/${actionStartTime}`
    : '';

export const markTestDryRunCleared = (
  namespace?: string,
  name?: string,
  actionStartTime?: string
): void => {
  const key = testSessionKey(namespace, name, actionStartTime);
  if (key) clearedDryRunSessions.add(key);
};

export const isTestDryRunClearPending = (
  namespace?: string,
  name?: string,
  actionStartTime?: string
): boolean =>
  clearedDryRunSessions.has(testSessionKey(namespace, name, actionStartTime));

export const clearTestDryRunPending = (
  namespace?: string,
  name?: string,
  actionStartTime?: string
): void => {
  clearedDryRunSessions.delete(
    testSessionKey(namespace, name, actionStartTime)
  );
};

// Other cluster in a 2-cluster DRPolicy (peer of clusterName).
export const getPeerClusterName = (
  clusterName: string,
  drClusterNames: string[] = []
): string =>
  clusterName
    ? drClusterNames.find((name) => !!name && name !== clusterName) || ''
    : '';

// True while a failover test is in progress. Ordinary WaitOnUserToCleanUp
// (without the test annotation) is not treated as a test.
export const isTestFailoverInProgress = (
  drpc: DRPlacementControlKind
): boolean => {
  const progression = drpc?.status?.progression;
  const dryRun = !!drpc?.spec?.dryRun;
  const ann =
    getAnnotations(drpc)?.[TEST_FAILOVER_DRYRUN_ANNOTATION] === 'true';

  if (dryRun) return true;
  if (progression === Progression.TestingFailover && (dryRun || ann)) {
    return true;
  }
  if (progression === Progression.WaitOnUserToCleanUp && ann) return true;
  return false;
};

// Status-label helper only (Cleaning up vs processing). Does not choose the
// Convert/Clean up patch — those come from getPromote / getEnd.
//
// After dryRun clears, Ramen may keep the test annotation while finishing:
// - Convert leaves failoverCluster on the test peer (peer of last-app home).
// - Clean up restores preferred/failover toward last-app home.
// Comparing failoverCluster to last-app-deployment-cluster matches those shapes
// for labeling. A new marker from the DR controller would be needed before
// replacing this heuristic; do not treat fo===home alone as proof of a wrong
// operation (patches are already action-specific).
export const isRevertingTestFailover = (
  drpc?: DRPlacementControlKind
): boolean => {
  if (!drpc || drpc.spec?.dryRun) return false;
  const annotations = getAnnotations(drpc);
  if (annotations?.[TEST_FAILOVER_DRYRUN_ANNOTATION] !== 'true') return false;

  const homeCluster =
    annotations?.[LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION] || '';
  const failoverCluster = drpc.spec?.failoverCluster;
  const isPromote =
    drpc.spec?.action === DRActionType.FAILOVER &&
    !!failoverCluster &&
    !!homeCluster &&
    failoverCluster !== homeCluster;
  return !isPromote;
};

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

export type EndTestFailoverPatchParams = {
  homeCluster: string;
  actionStartTime: string;
  // undefined = annotation missing (refuse); '' = Deployed restore.
  lastAction?: string;
  peerCluster?: string;
  currentFailoverCluster?: string;
};

// Restores pre-test placement. Returns null when Clean up must not run
// (missing/unknown last-action, or Failover restore without a distinct peer).
export const getEndTestFailoverPatch = (
  params: EndTestFailoverPatchParams
): Patch[] | null => {
  const {
    homeCluster,
    actionStartTime,
    lastAction,
    peerCluster = '',
    currentFailoverCluster = '',
  } = params;

  // Missing annotation: do not guess Deployed (empty string is Deployed).
  if (lastAction == null) {
    return null;
  }

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
    if (!peerCluster || peerCluster === homeCluster) {
      return null;
    }
    return [
      ...clearDryRun,
      { op: 'replace', path: '/spec/action', value: DRActionType.FAILOVER },
      {
        op: 'replace',
        path: '/spec/failoverCluster',
        value: homeCluster,
      },
      {
        op: 'add',
        path: '/spec/preferredCluster',
        value: peerCluster,
      },
    ];
  }

  if (lastAction === DRActionType.RELOCATE) {
    const patches: Patch[] = [
      ...clearDryRun,
      { op: 'replace', path: '/spec/action', value: DRActionType.RELOCATE },
      {
        op: 'add',
        path: '/spec/preferredCluster',
        value: homeCluster,
      },
    ];
    // Only clear failoverCluster when it still names the test peer (not home).
    const looksLikeTestLeftover =
      !!currentFailoverCluster && currentFailoverCluster !== homeCluster;
    if (looksLikeTestLeftover) {
      patches.push({ op: 'remove', path: '/spec/failoverCluster' });
    }
    return patches;
  }

  if (lastAction === '') {
    return [
      ...clearDryRun,
      { op: 'remove', path: '/spec/action' },
      { op: 'remove', path: '/spec/failoverCluster' },
      { op: 'add', path: '/spec/preferredCluster', value: homeCluster },
    ];
  }

  // Unknown last-action: do not guess a Deployed restore.
  return null;
};
