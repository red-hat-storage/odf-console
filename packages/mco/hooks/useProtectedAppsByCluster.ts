import * as React from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { ProtectedApplicationViewKind } from '../types';
import { getProtectedApplicationViewResourceObj } from './mco-resources';

export type ProtectedAppInfo = {
  name: string;
  namespace: string;
  drPolicy: string;
  status: string;
  pav: ProtectedApplicationViewKind;
};

export type ClusterAppsMap = {
  [clusterName: string]: ProtectedAppInfo[];
};

/**
 * Hook to get protected applications grouped by cluster name.
 * Only includes applications that are protected by a DR policy.
 */
export const useProtectedAppsByCluster = (): [
  ClusterAppsMap,
  boolean,
  Error | null,
] => {
  const [pavs, loaded, loadError] = useK8sWatchResource<
    ProtectedApplicationViewKind[]
  >(getProtectedApplicationViewResourceObj());

  const clusterAppsMap = React.useMemo<ClusterAppsMap>(() => {
    const map: ClusterAppsMap = {};

    if (loaded && !loadError && pavs) {
      pavs.forEach((pav) => {
        // Only process if it has a DR policy (protected)
        const drPolicyName = pav.status?.drInfo?.drpolicyRef?.name;
        if (!drPolicyName) {
          return;
        }

        const appName = pav.metadata?.name;
        const appNamespace = pav.metadata?.namespace;
        const phase = pav.status?.drInfo?.status?.phase || 'Unknown';

        // Get the list of clusters this app is deployed to
        // Fallback strategy:
        // 1. Use selectedClusters from placement decisions (most accurate)
        // 2. Use primaryCluster if set (when app is actively running)
        // 3. Use first drCluster as fallback (for apps in initiating state)
        const primaryCluster = pav.status?.drInfo?.primaryCluster;
        const drClusters = pav.status?.drInfo?.drClusters || [];
        const selectedClusters =
          pav.status?.placementInfo?.selectedClusters ||
          (primaryCluster
            ? [primaryCluster]
            : drClusters.length > 0
              ? [drClusters[0]]
              : []);

        // Create app info object
        const appInfo: ProtectedAppInfo = {
          name: appName,
          namespace: appNamespace,
          drPolicy: drPolicyName,
          status: phase,
          pav,
        };

        // Add this app to each cluster it's deployed on
        selectedClusters.forEach((clusterName) => {
          if (!map[clusterName]) {
            map[clusterName] = [];
          }
          map[clusterName].push(appInfo);
        });
      });
    }

    return map;
  }, [loaded, loadError, pavs]);

  return React.useMemo(
    () => [clusterAppsMap, loaded, loadError],
    [clusterAppsMap, loaded, loadError]
  );
};
