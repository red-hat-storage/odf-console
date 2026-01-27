import * as React from 'react';
import { DRApplication, GITOPS_OPERATOR_NAMESPACE } from '@odf/mco/constants';
import {
  DisasterRecoveryResourceKind,
  getApplicationSetResourceObj,
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  useArgoApplicationSetResourceWatch,
  useDisasterRecoveryResourceWatch,
} from '@odf/mco/hooks';
import {
  ACMManagedClusterKind,
  DRClusterAppsMap,
  DRClusterKind,
  Phase,
} from '@odf/mco/types';
import {
  findDeploymentClusters,
  getProtectedPVCsFromDRPC,
  getRemoteNamespaceFromAppSet,
  getReplicationType,
} from '@odf/mco/utils';
import { getName, getNamespace } from '@odf/shared/selectors';
import * as _ from 'lodash-es';

const getApplicationSetResources = (
  namespace: string,
  managedClusters: ACMManagedClusterKind[],
  managedClusterLoaded: boolean,
  managedClusterLoadError: any,
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any
) => ({
  resources: {
    applications: getApplicationSetResourceObj({ namespace }),
    placements: getPlacementResourceObj({ namespace }),
    placementDecisions: getPlacementDecisionsResourceObj({ namespace }),
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

const getDRResources = (namespace: string) => ({
  resources: {
    drClusters: getDRClusterResourceObj(),
    drPolicies: getDRPolicyResourceObj(),
    drPlacementControls: getDRPlacementControlResourceObj({ namespace }),
  },
});

export const useApplicationSetParser: UseApplicationSetParser = (
  managedClusters,
  managedClusterLoaded,
  managedClusterLoadError
) => {
  // Watch only DRPC from openshift-gitops namespace
  const [drResources, drLoaded, drLoadError] = useDisasterRecoveryResourceWatch(
    getDRResources(GITOPS_OPERATOR_NAMESPACE)
  );

  const [argoApplicationSetResources, loaded, loadError] =
    useArgoApplicationSetResourceWatch(
      getApplicationSetResources(
        GITOPS_OPERATOR_NAMESPACE,
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
            totalManagedAppsCount: 0,
            protectedApps: [],
          };
          return acc;
        },
        {} as DRClusterAppsMap
      );

      // DRCluster to its ApplicationSets (total and protected) mapping
      formattedArgoAppSetResources.forEach((argoApplicationSetResource) => {
        const { application } = argoApplicationSetResource || {};
        const { drPlacementControl, drPolicy, placementDecision } =
          argoApplicationSetResource.placements?.[0] || {};
        const deploymentClusters = findDeploymentClusters(
          placementDecision,
          drPlacementControl
        );
        deploymentClusters.forEach((decisionCluster) => {
          if (drClusterAppsMap.hasOwnProperty(decisionCluster)) {
            drClusterAppsMap[decisionCluster].totalManagedAppsCount =
              drClusterAppsMap[decisionCluster].totalManagedAppsCount + 1;
            if (!_.isEmpty(drPlacementControl)) {
              drClusterAppsMap[decisionCluster].protectedApps.push({
                appName: getName(application),
                appNamespace: getNamespace(application),
                appKind: application?.kind,
                appAPIVersion: application?.apiVersion,
                appType: DRApplication.APPSET,
                placementControlInfo: [
                  {
                    deploymentClusterName: decisionCluster,
                    drpcName: getName(drPlacementControl),
                    drpcNamespace: getNamespace(drPlacementControl),
                    protectedPVCs: getProtectedPVCsFromDRPC(drPlacementControl),
                    replicationType: getReplicationType(drPolicy),
                    volumeSyncInterval: drPolicy?.spec?.schedulingInterval,
                    workloadNamespaces: [
                      getRemoteNamespaceFromAppSet(application),
                    ],
                    failoverCluster: drPlacementControl?.spec?.failoverCluster,
                    preferredCluster:
                      drPlacementControl?.spec?.preferredCluster,
                    lastVolumeGroupSyncTime:
                      drPlacementControl?.status?.lastGroupSyncTime,
                    status: drPlacementControl?.status?.phase as Phase,
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
  managedClusters: ACMManagedClusterKind[],
  managedClusterLoaded: boolean,
  managedClusterLoadError: any
) => UseApplicationSetParserResult;
