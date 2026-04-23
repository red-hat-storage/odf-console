import * as React from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  DRPlacementControlConditionType,
  DRPlacementControlKind,
  ProtectedApplicationViewKind,
} from '../types';
import {
  DRStatus,
  getEffectiveDRStatus,
  shouldShowProtectionError,
} from '../utils/dr-status';
import {
  getDRPlacementControlResourceObj,
  getProtectedApplicationViewResourceObj,
} from './mco-resources';

export type ProtectedAppInfo = {
  name: string;
  namespace: string;
  drPolicy: string;
  status: DRStatus;
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
  const [pavs, pavsLoaded, pavsLoadError] = useK8sWatchResource<
    ProtectedApplicationViewKind[]
  >(getProtectedApplicationViewResourceObj());

  const [drpcs, drpcsLoaded, drpcsLoadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj());

  const loaded = pavsLoaded && drpcsLoaded;
  const loadError = pavsLoadError || drpcsLoadError;

  const clusterAppsMap = React.useMemo<ClusterAppsMap>(() => {
    const map: ClusterAppsMap = {};

    if (loaded && !loadError && pavs) {
      const drpcByName = new Map<string, DRPlacementControlKind>();
      drpcs?.forEach((drpc) => {
        const name = drpc.metadata?.name;
        if (name) drpcByName.set(name, drpc);
      });

      pavs.forEach((pav) => {
        // Only process if it has a DR policy (protected)
        const drPolicyName = pav.status?.drInfo?.drpolicyRef?.name;
        if (!drPolicyName) {
          return;
        }

        const appName = pav.metadata?.name;
        const appNamespace = pav.metadata?.namespace;
        const phase = pav.status?.drInfo?.status?.phase;

        const drpcName = pav.spec?.drpcRef?.name;
        const drpc = drpcName ? drpcByName.get(drpcName) : undefined;
        const progression = drpc?.status?.progression;
        const protectedCondition = drpc?.status?.conditions?.find(
          (c) => c.type === DRPlacementControlConditionType.Protected
        );
        const hasProtectionError =
          shouldShowProtectionError(protectedCondition);
        const volumeLastGroupSyncTime = drpc?.status?.lastGroupSyncTime;

        // Compute DR status using shared logic
        const status = getEffectiveDRStatus(
          phase,
          progression,
          hasProtectionError,
          protectedCondition,
          volumeLastGroupSyncTime
        );

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
          status,
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
  }, [loaded, loadError, pavs, drpcs]);

  return React.useMemo(
    () => [clusterAppsMap, loaded, loadError],
    [clusterAppsMap, loaded, loadError]
  );
};
