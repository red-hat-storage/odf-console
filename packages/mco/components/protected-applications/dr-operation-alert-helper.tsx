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
      if (currentApp.spec?.dryRun && currentFailover) {
        testTargetByDrpcRef.current.set(key, currentFailover);
      }

      const trackedTarget = testTargetByDrpcRef.current.get(key);

      // Clean up (or any rewrite) moved failoverCluster off the recorded test
      // peer — drop tracking so we never announce Convert for that abort.
      if (
        trackedTarget &&
        currentFailover &&
        currentFailover !== trackedTarget
      ) {
        testTargetByDrpcRef.current.delete(key);
      }

      const prevApp = prevApps.find(
        (app) =>
          getName(app) === getName(currentApp) &&
          getNamespace(app) === getNamespace(currentApp)
      );

      if (!prevApp) return;

      const prevPhase = prevApp.status?.phase;
      const currentPhase = currentApp.status?.phase;

      // Real failover: FailingOver → FailedOver (not a dry-run test).
      const finishedRealFailover =
        prevPhase === Phase.FailingOver &&
        currentPhase === Phase.FailedOver &&
        !currentApp.spec?.dryRun;

      // Convert: hold is already FailedOver with dryRun. Clearing dryRun alone
      // is too early — Ramen may still retry WaitForReadiness. Announce only
      // when progression confirms promotion (Cleaning Up / Completed). dryRun
      // and progression may update in one watch or two. Use the original test
      // peer, not the previous watch.
      const originalTestTarget = testTargetByDrpcRef.current.get(key);
      const sameFailoverCluster =
        !!originalTestTarget && currentFailover === originalTestTarget;
      const progression = currentApp.status?.progression;
      const prevProgression = prevApp.status?.progression;
      const convertPromotionConfirmed =
        progression === Progression.Completed ||
        progression === Progression.CleaningUp;
      const prevAlreadyConfirmed =
        prevProgression === Progression.Completed ||
        prevProgression === Progression.CleaningUp;
      const wasInTestSession =
        !!prevApp.spec?.dryRun ||
        prevProgression === Progression.TestingFailover ||
        // Mid-promote after dryRun cleared (e.g. WaitForReadiness).
        (!!originalTestTarget && !prevApp.spec?.dryRun);
      const convertedFromTest =
        !currentApp.spec?.dryRun &&
        currentPhase === Phase.FailedOver &&
        sameFailoverCluster &&
        convertPromotionConfirmed &&
        !prevAlreadyConfirmed &&
        wasInTestSession;

      if (finishedRealFailover || convertedFromTest) {
        const failoverCluster =
          currentApp.spec?.failoverCluster ||
          currentApp.status?.preferredDecision?.clusterName ||
          '';
        const alertUrl = `${PROTECTED_APPLICATIONS_PATH}?${FAILED_OVER_APP_QUERY_PARAM}=${getName(
          currentApp
        )}&${FAILED_OVER_CLUSTER_QUERY_PARAM}=${failoverCluster}`;
        navigate(alertUrl, { replace: true });
        testTargetByDrpcRef.current.delete(key);
      }

      // Detect relocate completion
      if (prevPhase === Phase.Relocating && currentPhase === Phase.Relocated) {
        const preferredCluster =
          currentApp.spec?.preferredCluster ||
          currentApp.status?.preferredDecision?.clusterName ||
          '';
        const alertUrl = `${PROTECTED_APPLICATIONS_PATH}?${RELOCATED_APP_QUERY_PARAM}=${getName(
          currentApp
        )}&${RELOCATED_CLUSTER_QUERY_PARAM}=${preferredCluster}`;
        navigate(alertUrl, { replace: true });
      }

      // Drop leftovers after the DRPC settles (Convert already cleared above;
      // Clean up clears on failoverCluster rewrite).
      if (
        !convertedFromTest &&
        !currentApp.spec?.dryRun &&
        currentApp.status?.progression === Progression.Completed
      ) {
        testTargetByDrpcRef.current.delete(key);
      }
    });

    lastApplicationsStateRef.current = applications;
  }, [applications, navigate, location.pathname]);
};
