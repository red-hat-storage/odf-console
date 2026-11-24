import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useLocation, useNavigate } from 'react-router';
import { DR_BASE_ROUTE } from '../../constants';
import { DRPlacementControlKind, Phase, Progression } from '../../types';
import { getNameNamespace } from '../../utils/disaster-recovery';

/**
 * Query parameter constants for DR operation completion alerts
 */
export const RELOCATED_APP_QUERY_PARAM = 'relocated_app';
export const RELOCATED_CLUSTER_QUERY_PARAM = 'relocated_cluster';
export const FAILED_OVER_APP_QUERY_PARAM = 'failedover_app';
export const FAILED_OVER_CLUSTER_QUERY_PARAM = 'failedover_cluster';

const PROTECTED_APPLICATIONS_PATH = `${DR_BASE_ROUTE}/protected-applications`;

const drpcKey = (drpc: DRPlacementControlKind): string =>
  getNameNamespace(getName(drpc), getNamespace(drpc));

/**
 * Custom hook to detect when a DR operation (failover/relocate) completes
 * and update URL query parameters to show alerts.
 * Only updates query params if user is already on the protected-applications page.
 * This follows the same pattern as enrollment alerts.
 */
export const useDROperationAlert = (applications: DRPlacementControlKind[]) => {
  const navigate = useNavigate();
  const location = useLocation();
  const lastApplicationsStateRef = React.useRef<DRPlacementControlKind[]>([]);
  // Original test peer (failoverCluster) while dryRun is set. Convert leaves
  // that peer unchanged; Clean up rewrites it toward home. Comparing only to
  // the previous watch can miss a Clean up that rewrites fo before status
  // leaves TestingFailover (prev and current then both show home).
  const testTargetByDrpcRef = React.useRef<Map<string, string>>(new Map());

  React.useEffect(() => {
    const prevApps = lastApplicationsStateRef.current;
    const isOnProtectedApplicationsPage = location.pathname.includes(
      PROTECTED_APPLICATIONS_PATH
    );

    // Only update alerts if user is already on the protected-applications page
    if (!isOnProtectedApplicationsPage) {
      lastApplicationsStateRef.current = applications;
      return;
    }

    applications.forEach((currentApp) => {
      const key = drpcKey(currentApp);
      const currentFailover = currentApp.spec?.failoverCluster || '';

      // Record the test peer while dryRun is active (even on first sight).
      // Keep it after Clean up moves failoverCluster home. Convert still
      // requires the current cluster to be that peer, so this does not
      // announce Convert. Forgetting it here makes the later Completed watch
      // look like a real failover.
      if (currentApp.spec?.dryRun && currentFailover) {
        testTargetByDrpcRef.current.set(key, currentFailover);
      }

      const prevApp = prevApps.find(
        (app) =>
          getName(app) === getName(currentApp) &&
          getNamespace(app) === getNamespace(currentApp)
      );

      if (!prevApp) return;

      const prevPhase = prevApp.status?.phase;
      const currentPhase = currentApp.status?.phase;
      const prevProgression = prevApp.status?.progression;
      const progression = currentApp.status?.progression;
      const progressionDone =
        !progression || progression === Progression.Completed;
      // An empty progression is already finished. Treating that as still
      // running would raise the banner again on every later watch.
      const prevProgressionDone =
        !prevProgression || prevProgression === Progression.Completed;

      // Convert: hold is already FailedOver with dryRun. Clearing dryRun alone
      // is too early — Ramen may still retry WaitForReadiness, and Cleaning Up
      // can be followed by EnsuringVolSyncSetup or WaitOnUserToCleanUp.
      // Announce once, on the same finished-progression edge as a real failover.
      // Use the original test peer, not the previous watch.
      const originalTestTarget = testTargetByDrpcRef.current.get(key);
      const sameFailoverCluster =
        !!originalTestTarget && currentFailover === originalTestTarget;
      const wasInTestSession =
        !!prevApp.spec?.dryRun ||
        prevProgression === Progression.TestingFailover ||
        // Mid-promote after dryRun cleared (e.g. WaitForReadiness).
        (!!originalTestTarget && !prevApp.spec?.dryRun);
      const convertedFromTest =
        !currentApp.spec?.dryRun &&
        currentPhase === Phase.FailedOver &&
        sameFailoverCluster &&
        progressionDone &&
        !prevProgressionDone &&
        wasInTestSession;

      // Real failover. Ramen often sets FailedOver while a step such as
      // WaitForReadiness or Cleaning Up is still running, so completion can
      // arrive on a later watch. Test promotion is announced above.
      const finishedRealFailover =
        !currentApp.spec?.dryRun &&
        !wasInTestSession &&
        currentPhase === Phase.FailedOver &&
        progressionDone &&
        (prevPhase === Phase.FailingOver ||
          (prevPhase === Phase.FailedOver && !prevProgressionDone));

      if (finishedRealFailover || convertedFromTest) {
        const failoverCluster =
          currentApp.spec?.failoverCluster ||
          currentApp.status?.preferredDecision?.clusterName ||
          '';
        const alertUrl = `${PROTECTED_APPLICATIONS_PATH}?${FAILED_OVER_APP_QUERY_PARAM}=${getName(
          currentApp
        )}&${FAILED_OVER_CLUSTER_QUERY_PARAM}=${failoverCluster}`;
        navigate(alertUrl, { replace: true });
        // Keep the test peer until the operation settles. Deleting it at
        // Cleaning Up makes the next watch look like a new real failover.
        // An empty progression is settled too, and leaving the peer recorded
        // would hide the banner for a later failover.
        if (progressionDone) {
          testTargetByDrpcRef.current.delete(key);
        }
      }

      const relocateCompleted =
        currentPhase === Phase.Relocated &&
        progressionDone &&
        (prevPhase === Phase.Relocating ||
          (prevPhase === Phase.Relocated && !prevProgressionDone));

      if (relocateCompleted) {
        const preferredCluster =
          currentApp.spec?.preferredCluster ||
          currentApp.status?.preferredDecision?.clusterName ||
          '';
        const alertUrl = `${PROTECTED_APPLICATIONS_PATH}?${RELOCATED_APP_QUERY_PARAM}=${getName(
          currentApp
        )}&${RELOCATED_CLUSTER_QUERY_PARAM}=${preferredCluster}`;
        navigate(alertUrl, { replace: true });
      }

      // Drop leftovers once the DRPC has settled, including an empty
      // progression. Convert may already have cleared the peer above.
      // Clean up keeps it through Cleaning Up, then this watch clears it so
      // the next failover or relocate is not treated as part of the test.
      if (!convertedFromTest && !currentApp.spec?.dryRun && progressionDone) {
        testTargetByDrpcRef.current.delete(key);
      }
    });

    lastApplicationsStateRef.current = applications;
  }, [applications, navigate, location.pathname]);
};
