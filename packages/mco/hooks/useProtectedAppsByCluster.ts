import { getName, getNamespace } from '@odf/shared';
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
export const useProtectedAppsByCluster = (): [ClusterAppsMap, boolean, any] => {
  const [pavs, loaded, loadError] = useK8sWatchResource<
    ProtectedApplicationViewKind[]
  >(getProtectedApplicationViewResourceObj());

  const clusterAppsMap: ClusterAppsMap = {};

  if (loaded && !loadError && pavs) {
    pavs.forEach((pav) => {
      // Only process if it has a DR policy (protected)
      const drPolicyName = pav.status?.drInfo?.drpolicyRef?.name;
      if (!drPolicyName) {
        return;
      }

      const appName = getName(pav);
      const appNamespace = getNamespace(pav);
      const phase = pav.status?.drInfo?.status?.phase || 'Unknown';

      // Get the list of clusters this app is deployed to
      const selectedClusters =
        pav.status?.placementInfo?.selectedClusters || [];

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
        if (!clusterAppsMap[clusterName]) {
          clusterAppsMap[clusterName] = [];
        }
        clusterAppsMap[clusterName].push(appInfo);
      });
    });
  }

  return [clusterAppsMap, loaded, loadError];
};
