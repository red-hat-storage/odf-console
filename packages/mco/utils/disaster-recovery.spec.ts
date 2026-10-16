import { LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION } from '@odf/mco/constants';
import type { DRPlacementControlKind } from '@odf/mco/types';
import { Phase, Progression } from '@odf/mco/types';
import {
  getPrimaryClusterName,
  isTestFailoverActive,
  resolvePrimaryClusterName,
} from './disaster-recovery';

const C1 = 'amagrawa-3sept-c1';
const C2 = 'amagrawa-3sept-c2';
const DR_CLUSTERS = [C1, C2];

type DRPCOverrides = {
  dryRun?: boolean;
  phase?: Phase;
  progression?: Progression;
  preferredCluster?: string;
  failoverCluster?: string;
  lastAppDeploymentCluster?: string;
};

const drpc = ({
  dryRun,
  phase,
  progression,
  preferredCluster,
  failoverCluster,
  lastAppDeploymentCluster,
}: DRPCOverrides): DRPlacementControlKind =>
  ({
    metadata: {
      name: 'cephfs-disc1',
      namespace: 'openshift-dr-ops',
      annotations: {
        ...(lastAppDeploymentCluster && {
          [LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION]: lastAppDeploymentCluster,
        }),
      },
    },
    spec: {
      ...(dryRun !== undefined && { dryRun }),
      action: 'Failover',
      preferredCluster,
      failoverCluster,
    },
    status: { phase, progression },
  }) as unknown as DRPlacementControlKind;

/**
 * An in-flight dry-run test: Ramen reports phase FailedOver and has moved the
 * last-app-deployment-cluster annotation to the test cluster.
 */
const activeTest = (overrides: DRPCOverrides) =>
  drpc({
    dryRun: true,
    phase: Phase.FailedOver,
    progression: Progression.TestingFailover,
    failoverCluster: C2,
    lastAppDeploymentCluster: C2,
    ...overrides,
  });

describe('isTestFailoverActive', () => {
  it('is true only while the test is in the TestingFailover hold state', () => {
    expect(isTestFailoverActive(activeTest({}))).toBe(true);
  });

  it('is false once the test has been reverted or promoted', () => {
    expect(
      isTestFailoverActive(
        activeTest({ dryRun: false, progression: Progression.Completed })
      )
    ).toBe(false);
  });

  it('is false for a DRPC with no status yet', () => {
    expect(isTestFailoverActive(drpc({ dryRun: true }))).toBe(false);
  });
});

describe('resolvePrimaryClusterName', () => {
  // DFBUGS-10990. The real primary is the peer of the test cluster. It cannot
  // be read off the DRPC: the phase is FailedOver, the annotation has moved to
  // the test cluster, and preferredCluster is unreliable (see the next case).
  it('returns the peer of the test cluster when the workload was on its preferred cluster', () => {
    expect(
      resolvePrimaryClusterName(
        activeTest({ preferredCluster: C1 }),
        DR_CLUSTERS
      )
    ).toBe(C1);
  });

  // Workload previously failed over onto C1, so preferredCluster is still C2,
  // the original home. Starting a test to C2 makes preferredCluster and
  // failoverCluster identical, and only the peer lookup survives it.
  it('returns the peer of the test cluster when preferredCluster is itself the test cluster', () => {
    expect(
      resolvePrimaryClusterName(
        activeTest({ preferredCluster: C2 }),
        DR_CLUSTERS
      )
    ).toBe(C1);
  });

  it('falls back to the plain phase logic when no test is in flight', () => {
    expect(
      resolvePrimaryClusterName(
        drpc({
          phase: Phase.FailedOver,
          progression: Progression.Completed,
          preferredCluster: C1,
          failoverCluster: C2,
          lastAppDeploymentCluster: C2,
        }),
        DR_CLUSTERS
      )
    ).toBe(C2);
  });

  it('falls back to the failover cluster when the annotation is missing', () => {
    expect(
      resolvePrimaryClusterName(
        activeTest({ preferredCluster: C1, lastAppDeploymentCluster: '' }),
        DR_CLUSTERS
      )
    ).toBe(C1);
  });

  // Without a known test cluster the peer lookup would return whichever
  // cluster happens to be first, which could be the test cluster itself.
  it('returns an empty string when the test cluster cannot be determined', () => {
    expect(
      resolvePrimaryClusterName(
        activeTest({ failoverCluster: '', lastAppDeploymentCluster: '' }),
        DR_CLUSTERS
      )
    ).toBe('');
  });

  it('returns an empty string when the policy clusters are unavailable', () => {
    expect(resolvePrimaryClusterName(activeTest({}), undefined)).toBe('');
  });
});

describe('getPrimaryClusterName', () => {
  it('returns the failover cluster after a real failover', () => {
    expect(
      getPrimaryClusterName(
        drpc({
          phase: Phase.FailedOver,
          preferredCluster: C1,
          failoverCluster: C2,
          lastAppDeploymentCluster: C2,
        })
      )
    ).toBe(C2);
  });

  it('returns the preferred cluster after a relocate', () => {
    expect(
      getPrimaryClusterName(
        drpc({
          phase: Phase.Relocated,
          preferredCluster: C1,
          failoverCluster: C2,
          lastAppDeploymentCluster: C1,
        })
      )
    ).toBe(C1);
  });

  it('returns the deployment cluster once a dry-run test has been reverted', () => {
    expect(
      getPrimaryClusterName(
        drpc({
          dryRun: false,
          phase: Phase.Deployed,
          progression: Progression.Completed,
          preferredCluster: C1,
          failoverCluster: C2,
          lastAppDeploymentCluster: C1,
        })
      )
    ).toBe(C1);
  });

  it('returns an empty string when the phase is not yet set', () => {
    expect(getPrimaryClusterName(drpc({}))).toBe('');
  });
});
