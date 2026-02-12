import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useLocation, useNavigate } from 'react-router-dom-v5-compat';
import { DR_BASE_ROUTE } from '../../constants';
import { DRPlacementControlKind, Phase } from '../../types';

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

      // Detect failover completion
      if (
        prevPhase === Phase.FailingOver &&
        currentPhase === Phase.FailedOver
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
    });

    lastApplicationsStateRef.current = applications;
  }, [applications, navigate, location.pathname]);
};
