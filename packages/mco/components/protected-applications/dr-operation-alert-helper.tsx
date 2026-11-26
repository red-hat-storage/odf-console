import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useLocation, useNavigate } from 'react-router';
import { DR_BASE_ROUTE } from '../../constants';
import { DRPlacementControlKind, Phase, Progression } from '../../types';

/**
 * Query parameter constants for DR operation completion alerts
 */
export const RELOCATED_APP_QUERY_PARAM = 'relocated_app';
export const RELOCATED_CLUSTER_QUERY_PARAM = 'relocated_cluster';
export const FAILED_OVER_APP_QUERY_PARAM = 'failedover_app';
export const FAILED_OVER_CLUSTER_QUERY_PARAM = 'failedover_cluster';

const PROTECTED_APPLICATIONS_PATH = `${DR_BASE_ROUTE}/protected-applications`;

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

      // Phase can already be FailedOver while a step is still running, so the
      // banner waits until progression finishes. A dry-run test is not a
      // completed failover. The finish may be the same watch as the phase
      // change, or a later one.
      if (
        !currentApp.spec?.dryRun &&
        currentPhase === Phase.FailedOver &&
        progressionDone &&
        !prevProgressionDone &&
        (prevPhase === Phase.FailingOver || prevPhase === Phase.FailedOver)
      ) {
        const failoverCluster =
          currentApp.spec?.failoverCluster ||
          currentApp.status?.preferredDecision?.clusterName ||
          '';
        const alertUrl = `${PROTECTED_APPLICATIONS_PATH}?${FAILED_OVER_APP_QUERY_PARAM}=${getName(
          currentApp
        )}&${FAILED_OVER_CLUSTER_QUERY_PARAM}=${failoverCluster}`;
        navigate(alertUrl, { replace: true });
      }

      if (
        currentPhase === Phase.Relocated &&
        progressionDone &&
        !prevProgressionDone &&
        (prevPhase === Phase.Relocating || prevPhase === Phase.Relocated)
      ) {
        const preferredCluster =
          currentApp.spec?.preferredCluster ||
          currentApp.status?.preferredDecision?.clusterName ||
          '';
        const alertUrl = `${PROTECTED_APPLICATIONS_PATH}?${RELOCATED_APP_QUERY_PARAM}=${getName(
          currentApp
        )}&${RELOCATED_CLUSTER_QUERY_PARAM}=${preferredCluster}`;
        navigate(alertUrl, { replace: true });
      }
    });

    lastApplicationsStateRef.current = applications;
  }, [applications, navigate, location.pathname]);
};
