import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useNavigate } from 'react-router-dom-v5-compat';
import { DRPCStatus, DR_BASE_ROUTE } from '../../constants';
import { DRPlacementControlKind } from '../../types';

/**
 * Custom hook to detect when a DR operation (failover/relocate) completes
 * and navigate with alert query parameters
 */
export const RELOCATED_APP_QUERY_PARAM = 'relocated_app';
export const RELOCATED_CLUSTER_QUERY_PARAM = 'relocated_cluster';
export const FAILED_OVER_APP_QUERY_PARAM = 'failedover_app';
export const FAILED_OVER_CLUSTER_QUERY_PARAM = 'failedover_cluster';

export const useDROperationAlert = (applications: DRPlacementControlKind[]) => {
  const navigate = useNavigate();
  const lastApplicationsStateRef = React.useRef<DRPlacementControlKind[]>([]);

  React.useEffect(() => {
    const prevApps = lastApplicationsStateRef.current;

    applications.forEach((currentApp) => {
      const prevApp = prevApps.find(
        (app) =>
          getName(app) === getName(currentApp) &&
          getNamespace(app) === getNamespace(currentApp)
      );

      if (!prevApp) return;

      const prevPhase = prevApp.status?.phase;
      const currentPhase = currentApp.status?.phase;
      const targetCluster =
        currentApp.status?.preferredDecision?.clusterName || '';

      // Detect failover completion
      if (
        prevPhase === DRPCStatus.FailingOver &&
        currentPhase === DRPCStatus.FailedOver
      ) {
        navigate(
          `${DR_BASE_ROUTE}/protected-applications?${FAILED_OVER_APP_QUERY_PARAM}=${getName(
            currentApp
          )}&${FAILED_OVER_CLUSTER_QUERY_PARAM}=${targetCluster}`,
          { replace: true }
        );
      }

      // Detect relocate completion
      if (
        prevPhase === DRPCStatus.Relocating &&
        currentPhase === DRPCStatus.Relocated
      ) {
        navigate(
          `${DR_BASE_ROUTE}/protected-applications?${RELOCATED_APP_QUERY_PARAM}=${getName(
            currentApp
          )}&${RELOCATED_CLUSTER_QUERY_PARAM}=${targetCluster}`,
          { replace: true }
        );
      }
    });

    lastApplicationsStateRef.current = applications;
  }, [applications, navigate]);
};
