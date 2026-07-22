import * as React from 'react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  DRPlacementControlKind,
  DRPolicyKind,
  Phase,
  ProtectedApplicationViewKind,
} from '../types';
import {
  getReplicationHealth,
  getReplicationType,
  getProtectedCondition,
  getApplicationName,
} from '../utils';
import { DRStatus, getDRStatus, isCleanupRequired } from '../utils/dr-status';
import {
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
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

  const [drPolicies, drPoliciesLoaded, drPoliciesLoadError] =
    useK8sWatchResource<DRPolicyKind[]>(getDRPolicyResourceObj());

  const loaded = pavsLoaded && drpcsLoaded && drPoliciesLoaded;
  const loadError = pavsLoadError || drpcsLoadError || drPoliciesLoadError;

  const clusterAppsMap = React.useMemo<ClusterAppsMap>(() => {
    const map: ClusterAppsMap = {};

    if (loaded && !loadError && pavs) {
      const drpcByName = new Map<string, DRPlacementControlKind>();
      drpcs?.forEach((drpc) => {
        const name = drpc.metadata?.name;
        if (name) drpcByName.set(name, drpc);
      });

      const drPolicyByName = new Map<string, DRPolicyKind>();
      drPolicies?.forEach((policy) => {
        const name = policy.metadata?.name;
        if (name) drPolicyByName.set(name, policy);
      });

      pavs.forEach((pav) => {
        // Only process if it has a DR policy (protected)
        const drPolicyName = pav.status?.drInfo?.drpolicyRef?.name;
        if (!drPolicyName) {
          return;
        }

        const appName = getApplicationName(pav);
        const appNamespace = pav.metadata?.namespace;
        const phase = pav.status?.drInfo?.status?.phase as Phase;

        const drpcName = pav.spec?.drpcRef?.name;
        const drpc = drpcName ? drpcByName.get(drpcName) : undefined;
        const drPolicy = drPolicyByName.get(drPolicyName);
        const progression = drpc?.status?.progression;
        const protectedCondition = getProtectedCondition(drpc);
        const volumeLastGroupSyncTime = drpc?.status?.lastGroupSyncTime;
        const schedulingInterval = drPolicy?.spec?.schedulingInterval;

        const volumeReplicationHealth = getReplicationHealth(
          volumeLastGroupSyncTime,
          schedulingInterval,
          drPolicy ? getReplicationType(drPolicy) : undefined
        );

        const kubeObjectSchedulingInterval =
          drpc?.spec?.kubeObjectProtection?.captureInterval;
        const kubeObjectReplicationHealth = kubeObjectSchedulingInterval
          ? getReplicationHealth(
              drpc?.status?.lastKubeObjectProtectionTime,
              kubeObjectSchedulingInterval
            )
          : undefined;

        const status = getDRStatus({
          isCleanupRequired: isCleanupRequired(
            drpc?.status?.phase,
            drpc?.status?.progression
          ),
          phase,
          volumeReplicationHealth,
          kubeObjectReplicationHealth,
          progression,
          volumeLastGroupSyncTime,
          protectedCondition,
          schedulingInterval,
          actionStartTime: drpc?.status?.actionStartTime,
          action: drpc?.spec?.action,
          dryRun: drpc?.spec?.dryRun,
        });

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
  }, [loaded, loadError, pavs, drpcs, drPolicies]);

  return React.useMemo(
    () => [clusterAppsMap, loaded, loadError],
    [clusterAppsMap, loaded, loadError]
  );
};
