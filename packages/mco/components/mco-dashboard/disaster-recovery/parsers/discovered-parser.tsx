import * as React from 'react';
import { DRApplication, DISCOVERED_APP_NS } from '@odf/mco/constants';
import {
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
} from '@odf/mco/hooks';
import {
  ACMManagedClusterKind,
  DRClusterAppsMap,
  DRClusterKind,
  DRPlacementControlKind,
  DRPolicyKind,
  Phase,
} from '@odf/mco/types';
import {
  findDRPolicyUsingDRPC,
  getReplicationType,
  getProtectedPVCsFromDRPC,
  getPrimaryClusterName,
} from '@odf/mco/utils';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

const getDRResources = (namespace: string) => ({
  drClusters: getDRClusterResourceObj(),
  drPolicies: getDRPolicyResourceObj(),
  drPlacementControls: getDRPlacementControlResourceObj({ namespace }),
});

export const useDiscoveredParser: UseDiscoveredParser = (
  managedClusters,
  managedClusterLoaded,
  managedClusterLoadError
) => {
  // Watch only DRPC from discovered application namespace
  const drResources = useK8sWatchResources<WatchResourceType>(
    getDRResources(DISCOVERED_APP_NS)
  );

  const {
    data: drPolicies,
    loaded: drPolicyLoaded,
    loadError: drPolicyLoadError,
  } = drResources.drPolicies;
  const {
    data: drClusters,
    loaded: drClustersLoaded,
    loadError: drClustersLoadError,
  } = drResources.drClusters;
  const {
    data: drPlacementControls,
    loaded: drpcsLoaded,
    loadError: drpcsLoadError,
  } = drResources.drPlacementControls;

  const loaded =
    drPolicyLoaded && drClustersLoaded && drpcsLoaded && managedClusterLoaded;
  const loadError =
    drPolicyLoadError ||
    drClustersLoadError ||
    drpcsLoadError ||
    managedClusterLoadError;

  const drClusterAppsMap: DRClusterAppsMap = React.useMemo(() => {
    if (loaded && !loadError) {
      const drClusterAppsMap: DRClusterAppsMap = drClusters.reduce(
        (acc, drCluster) => {
          const clusterName = getName(drCluster);
          acc[clusterName] = {
            managedCluster: managedClusters.find(
              (managedCluster) => getName(managedCluster) === clusterName
            ),
            totalDiscoveredAppsCount: 0,
            protectedApps: [],
          };
          return acc;
        },
        {} as DRClusterAppsMap
      );

      // DRCluster to its ApplicationSets (total and protected) mapping
      drPlacementControls.forEach((drPlacementControl) => {
        const drPolicy = findDRPolicyUsingDRPC(drPlacementControl, drPolicies);
        const decisionCluster = getPrimaryClusterName(drPlacementControl);
        if (drClusterAppsMap.hasOwnProperty(decisionCluster)) {
          drClusterAppsMap[decisionCluster].totalDiscoveredAppsCount =
            drClusterAppsMap[decisionCluster].totalDiscoveredAppsCount + 1;
          if (!_.isEmpty(drPlacementControl)) {
            drClusterAppsMap[decisionCluster].protectedApps.push({
              appName: getName(drPlacementControl),
              appNamespace: getNamespace(drPlacementControl),
              appKind: drPlacementControl.kind,
              appAPIVersion: drPlacementControl.apiVersion,
              appType: DRApplication.DISCOVERED,
              placementControlInfo: [
                {
                  deploymentClusterName: decisionCluster,
                  drpcName: getName(drPlacementControl),
                  drpcNamespace: getNamespace(drPlacementControl),
                  protectedPVCs: getProtectedPVCsFromDRPC(drPlacementControl),
                  replicationType: getReplicationType(drPolicy),
                  volumeSyncInterval: drPolicy?.spec?.schedulingInterval,
                  workloadNamespaces:
                    drPlacementControl.spec?.protectedNamespaces || [],
                  failoverCluster: drPlacementControl.spec?.failoverCluster,
                  preferredCluster: drPlacementControl.spec?.preferredCluster,
                  lastVolumeGroupSyncTime:
                    drPlacementControl.status?.lastGroupSyncTime,
                  status: drPlacementControl.status?.phase as Phase,
                  kubeObjSyncInterval:
                    drPlacementControl.spec?.kubeObjectProtection
                      ?.captureInterval,
                  kubeObjectLastProtectionTime:
                    drPlacementControl?.status?.lastKubeObjectProtectionTime,
                },
              ],
            });
          }
        }
      });
      return drClusterAppsMap;
    }
    return {};
  }, [
    drClusters,
    drPolicies,
    drPlacementControls,
    managedClusters,
    loaded,
    loadError,
  ]);

  return [drClusterAppsMap, loaded, loadError];
};

type UseDiscoveredParserResult = [DRClusterAppsMap, boolean, any];

type UseDiscoveredParser = (
  managedClusters: ACMManagedClusterKind[],
  managedClusterLoaded: boolean,
  managedClusterLoadError: any
) => UseDiscoveredParserResult;

type WatchResourceType = {
  drPolicies?: DRPolicyKind[];
  drClusters?: DRClusterKind[];
  drPlacementControls?: DRPlacementControlKind[];
};
