import * as React from 'react';
import { APPLICATION_TYPE, DRPC_STATUS } from '@odf/mco/constants';
import {
  DisasterRecoveryResourceKind,
  getApplicationSetResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  useArgoApplicationSetResourceWatch,
} from '@odf/mco/hooks';
import {
  ACMManagedClusterKind,
  DRClusterAppsMap,
  DRClusterKind,
} from '@odf/mco/types';
import {
  findDRType,
  findDeploymentClusters,
  getProtectedPVCsFromDRPC,
  getRemoteNamespaceFromAppSet,
} from '@odf/mco/utils';
import { getName, getNamespace } from '@odf/shared/selectors';
import * as _ from 'lodash-es';

const getApplicationSetResources = (
  managedClusters: ACMManagedClusterKind[],
  managedClusterLoaded: boolean,
  managedClusterLoadError: any,
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any
) => ({
  resources: {
    applications: getApplicationSetResourceObj(),
    placements: getPlacementResourceObj(),
    placementDecisions: getPlacementDecisionsResourceObj(),
  },
  drResources: {
    data: drResources,
    loaded: drLoaded,
    loadError: drLoadError,
  },
  overrides: {
    managedClusters: {
      data: managedClusters,
      loaded: managedClusterLoaded,
      loadError: managedClusterLoadError,
    },
  },
});

export const useApplicationSetParser: UseApplicationSetParser = (
  drResources,
  drLoaded,
  drLoadError,
  managedClusters,
  managedClusterLoaded,
  managedClusterLoadError
) => {
  const [argoApplicationSetResources, loaded, loadError] =
    useArgoApplicationSetResourceWatch(
      getApplicationSetResources(
        managedClusters,
        managedClusterLoaded,
        managedClusterLoadError,
        drResources,
        drLoaded,
        drLoadError
      )
    );

  const drClusters: DRClusterKind[] = drResources?.drClusters;
  const formattedArgoAppSetResources =
    argoApplicationSetResources?.formattedResources;

  const drClusterAppsMap: DRClusterAppsMap = React.useMemo(() => {
    if (loaded && !loadError) {
      const drClusterAppsMap: DRClusterAppsMap = drClusters.reduce(
        (acc, drCluster) => {
          const clusterName = getName(drCluster);
          acc[clusterName] = {
            managedCluster: managedClusters.find(
              (managedCluster) => getName(managedCluster) === clusterName
            ),
            totalAppCount: 0,
            protectedApps: [],
          };
          return acc;
        },
        {} as DRClusterAppsMap
      );

      // DRCluster to its ApplicationSets (total and protected) mapping
      formattedArgoAppSetResources.forEach((argoApplicationSetResource) => {
        const { application } = argoApplicationSetResource || {};
        const {
          drClusters: currentDRClusters,
          drPlacementControl,
          drPolicy,
          placementDecision,
        } = argoApplicationSetResource.placements?.[0] || {};
        const deploymentClusters = findDeploymentClusters(
          placementDecision,
          drPlacementControl
        );
        deploymentClusters.forEach((decisionCluster) => {
          if (drClusterAppsMap.hasOwnProperty(decisionCluster)) {
            drClusterAppsMap[decisionCluster].totalAppCount =
              drClusterAppsMap[decisionCluster].totalAppCount + 1;
            if (!_.isEmpty(drPlacementControl)) {
              drClusterAppsMap[decisionCluster].protectedApps.push({
                appName: getName(application),
                appNamespace: getNamespace(application),
                appKind: application?.kind,
                appAPIVersion: application?.apiVersion,
                appType: APPLICATION_TYPE.APPSET,
                placementInfo: [
                  {
                    deploymentClusterName: decisionCluster,
                    drpcName: getName(drPlacementControl),
                    drpcNamespace: getNamespace(drPlacementControl),
                    protectedPVCs: getProtectedPVCsFromDRPC(drPlacementControl),
                    replicationType: findDRType(currentDRClusters),
                    syncInterval: drPolicy?.spec?.schedulingInterval,
                    workloadNamespace:
                      getRemoteNamespaceFromAppSet(application),
                    failoverCluster: drPlacementControl?.spec?.failoverCluster,
                    preferredCluster:
                      drPlacementControl?.spec?.preferredCluster,
                    lastGroupSyncTime:
                      drPlacementControl?.status?.lastGroupSyncTime,
                    status: drPlacementControl?.status?.phase as DRPC_STATUS,
                  },
                ],
              });
            }
          }
        });
      });
      return drClusterAppsMap;
    }
    return {};
  }, [
    drClusters,
    formattedArgoAppSetResources,
    managedClusters,
    loaded,
    loadError,
  ]);

  return [drClusterAppsMap, loaded, loadError];
};

type UseApplicationSetParserResult = [DRClusterAppsMap, boolean, any];

type UseApplicationSetParser = (
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any,
  managedClusters: ACMManagedClusterKind[],
  managedClusterLoaded: boolean,
  managedClusterLoadError: any
) => UseApplicationSetParserResult;
