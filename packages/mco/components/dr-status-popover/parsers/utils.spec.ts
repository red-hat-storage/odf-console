import {
  LAST_ACTION_ANNOTATION,
  LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION,
  TEST_FAILOVER_DRYRUN_ANNOTATION,
} from '@odf/mco/constants';
import type { DRPlacementControlKind } from '@odf/mco/types';
import { Progression } from '@odf/mco/types';
import { getProgressionFields } from './utils';

const ORIGINAL = 'amagrawa-15oct-b';
const TEST = 'amagrawa-15oct-c';
const DR_CLUSTERS = [ORIGINAL, TEST];

type DRPCOverrides = {
  dryRun?: boolean;
  action?: string;
  failoverCluster?: string;
  lastAppDeploymentCluster?: string;
  testFailoverAnnotation?: string;
  progression?: Progression;
  // null = omit key (missing); string = set annotation value ('' = Deployed).
  lastAction?: string | null;
};

const drpc = ({
  dryRun,
  action,
  failoverCluster = TEST,
  lastAppDeploymentCluster = ORIGINAL,
  testFailoverAnnotation = 'true',
  progression = Progression.WaitOnUserToCleanUp,
  lastAction = null,
}: DRPCOverrides): DRPlacementControlKind =>
  ({
    metadata: {
      name: 'cnv1',
      namespace: 'openshift-dr-ops',
      annotations: {
        ...(lastAppDeploymentCluster && {
          [LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION]: lastAppDeploymentCluster,
        }),
        ...(testFailoverAnnotation && {
          [TEST_FAILOVER_DRYRUN_ANNOTATION]: testFailoverAnnotation,
        }),
        ...(lastAction !== null && {
          [LAST_ACTION_ANNOTATION]: lastAction,
        }),
      },
    },
    spec: {
      ...(dryRun !== undefined && { dryRun }),
      ...(action && { action }),
      failoverCluster,
      preferredCluster: ORIGINAL,
      protectedNamespaces: ['cnv1'],
    },
    status: { progression },
  }) as unknown as DRPlacementControlKind;

const cleanupCluster = (overrides: DRPCOverrides) =>
  getProgressionFields(drpc(overrides), DR_CLUSTERS).testFailoverCleanupCluster;

describe('getProgressionFields: test failover cleanup cluster', () => {
  it('detects Deployed and Relocate reverts via peer of last-app', () => {
    expect(cleanupCluster({})).toBe(TEST);
    expect(cleanupCluster({ action: 'Relocate' })).toBe(TEST);
  });

  it('ignores promote, in-flight dryRun, and non-test cleanup', () => {
    const promote = getProgressionFields(
      drpc({
        action: 'Failover',
        dryRun: false,
        failoverCluster: TEST,
        lastAppDeploymentCluster: ORIGINAL,
      }),
      DR_CLUSTERS
    );
    expect(promote.testFailoverCleanupCluster).toBeUndefined();
    expect(promote.promotedFromTest).toBe(true);
    expect(promote.isRevertingTestFailover).toBe(false);

    const inFlight = getProgressionFields(
      drpc({
        dryRun: true,
        action: 'Failover',
        lastAppDeploymentCluster: TEST,
        progression: Progression.TestingFailover,
      }),
      DR_CLUSTERS
    );
    expect(inFlight.testFailoverCleanupCluster).toBeUndefined();
    expect(inFlight.promotedFromTest).toBe(false);
    expect(inFlight.isRevertingTestFailover).toBe(false);

    expect(
      cleanupCluster({ action: 'Relocate', testFailoverAnnotation: '' })
    ).toBeUndefined();
  });

  it('names the peer test cluster after Failover-shaped clean-up', () => {
    expect(
      cleanupCluster({
        action: 'Failover',
        failoverCluster: ORIGINAL,
        lastAppDeploymentCluster: ORIGINAL,
      })
    ).toBe(TEST);

    const fields = getProgressionFields(
      drpc({
        action: 'Failover',
        dryRun: false,
        failoverCluster: ORIGINAL,
        lastAppDeploymentCluster: ORIGINAL,
        progression: Progression.TestingFailover,
      }),
      DR_CLUSTERS
    );
    expect(fields.promotedFromTest).toBe(false);
    expect(fields.isRevertingTestFailover).toBe(true);
    expect(fields.testFailoverCleanupCluster).toBe(TEST);

    // Missing last-action stays undefined; empty string means Deployed.
    expect(
      getProgressionFields(drpc({}), DR_CLUSTERS).lastAction
    ).toBeUndefined();
    expect(
      getProgressionFields(drpc({ lastAction: '' }), DR_CLUSTERS).lastAction
    ).toBe('');
    expect(
      getProgressionFields(drpc({ lastAction: 'Failover' }), DR_CLUSTERS)
        .lastAction
    ).toBe('Failover');
  });
});
