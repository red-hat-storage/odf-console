import {
  LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION,
  TEST_FAILOVER_DRYRUN_ANNOTATION,
} from '@odf/mco/constants';
import type { DRPlacementControlKind } from '@odf/mco/types';
import { Progression } from '@odf/mco/types';
import { getProgressionFields } from './utils';

const ORIGINAL = 'amagrawa-15oct-b';
const TEST = 'amagrawa-15oct-c';

type DRPCOverrides = {
  dryRun?: boolean;
  action?: string;
  failoverCluster?: string;
  lastAppDeploymentCluster?: string;
  testFailoverAnnotation?: string;
  progression?: Progression;
};

const drpc = ({
  dryRun,
  action,
  failoverCluster = TEST,
  lastAppDeploymentCluster = ORIGINAL,
  testFailoverAnnotation = 'true',
  progression = Progression.WaitOnUserToCleanUp,
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
  getProgressionFields(drpc(overrides)).testFailoverCleanupCluster;

// DFBUGS-11111. Fixtures follow a captured dry-run lifecycle: during the test
// last-app-deployment-cluster is the test cluster, but Ramen points it back at
// the original as soon as the revert starts, while spec.failoverCluster stays
// on the test cluster until the DRPC settles.
describe('getProgressionFields: test failover cleanup cluster', () => {
  describe('revert', () => {
    // Captured state: action and dryRun both dropped from the spec,
    // failoverCluster still the test cluster, deployment cluster back home.
    it('detects a revert where the action was cleared', () => {
      expect(cleanupCluster({})).toBe(TEST);
    });

    it('detects a revert expressed as a relocate', () => {
      expect(cleanupCluster({ action: 'Relocate' })).toBe(TEST);
    });
  });

  describe('not a revert', () => {
    // On promote the workload stays on the test cluster, so the deployment
    // cluster catches up to it and the action remains Failover.
    it('ignores a promotion', () => {
      const fields = getProgressionFields(
        drpc({
          action: 'Failover',
          dryRun: false,
          lastAppDeploymentCluster: TEST,
        })
      );
      expect(fields.testFailoverCleanupCluster).toBeUndefined();
      expect(fields.promotedFromTest).toBe(true);
    });

    it('ignores a test that is still in flight', () => {
      const fields = getProgressionFields(
        drpc({
          dryRun: true,
          action: 'Failover',
          lastAppDeploymentCluster: TEST,
          progression: Progression.TestingFailover,
        })
      );
      expect(fields.testFailoverCleanupCluster).toBeUndefined();
      expect(fields.promotedFromTest).toBe(false);
    });

    it('ignores a cleanup unrelated to any dry run', () => {
      expect(
        cleanupCluster({ action: 'Relocate', testFailoverAnnotation: '' })
      ).toBeUndefined();
    });

    // Known limitation. When the workload had previously been failed over, a
    // revert re-points failoverCluster at the original cluster and the DRPC
    // stops recording the test cluster anywhere. Nothing identifies it, so no
    // cluster is named rather than the wrong one.
    it('names no cluster when a revert re-points the failover cluster home', () => {
      expect(
        cleanupCluster({
          action: 'Failover',
          failoverCluster: ORIGINAL,
          lastAppDeploymentCluster: ORIGINAL,
        })
      ).toBeUndefined();
    });

    // Failover clean-up restores failoverCluster to the production cluster while
    // last-app-deployment-cluster can still name the test target. That must not
    // look like a promote (which keeps both on the test cluster).
    it('does not treat Failover clean-up as a promotion', () => {
      const fields = getProgressionFields(
        drpc({
          action: 'Failover',
          dryRun: false,
          failoverCluster: ORIGINAL,
          lastAppDeploymentCluster: TEST,
          progression: Progression.TestingFailover,
        })
      );
      expect(fields.promotedFromTest).toBe(false);
    });
  });
});
