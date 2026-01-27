import * as React from 'react';
import { DRApplication } from '@odf/mco/constants';
import {
  SubscriptionGroupType,
  useDisasterRecoveryResourceWatch,
  useSubscriptionResourceWatch,
} from '@odf/mco/hooks';
import {
  ACMManagedClusterKind,
  ACMPlacementDecisionKind,
  DRClusterAppsMap,
  DRClusterKind,
  PlacementControlInfo,
  ProtectedAppsMap,
  Phase,
} from '@odf/mco/types';
import {
  getProtectedPVCsFromDRPC,
  findDeploymentClusters,
  getReplicationType,
} from '@odf/mco/utils';
import { ACMPlacementModel } from '@odf/shared';
import { ApplicationKind } from '@odf/shared';
import { getName, getNamespace } from '@odf/shared/selectors';
import * as _ from 'lodash-es';

const createPlacementControlInfoList = (
  subscriptionGroupsList: SubscriptionGroupType[],
  clusterName: string,
  applicationNamespace: string
): PlacementControlInfo[] => {
  const placementInfoList: PlacementControlInfo[] = [];

  subscriptionGroupsList.forEach((subscriptionGroup) => {
    const { drInfo } = subscriptionGroup;
    if (!_.isEmpty(drInfo)) {
      const { drPlacementControl, drPolicy } = drInfo;
      const placementControlInfo: PlacementControlInfo = {
        deploymentClusterName: clusterName,
        drpcName: getName(drPlacementControl),
        drpcNamespace: getNamespace(drPlacementControl),
        protectedPVCs: getProtectedPVCsFromDRPC(drPlacementControl),
        replicationType: getReplicationType(drPolicy),
        volumeSyncInterval: drPolicy?.spec?.schedulingInterval,
        workloadNamespaces: [applicationNamespace],
        failoverCluster: drPlacementControl?.spec?.failoverCluster,
        preferredCluster: drPlacementControl?.spec?.preferredCluster,
        lastVolumeGroupSyncTime: drPlacementControl?.status?.lastGroupSyncTime,
        status: drPlacementControl?.status?.phase as Phase,
        subscriptions: subscriptionGroup?.subscriptions?.map((subs) =>
          getName(subs)
        ),
      };

      placementInfoList.push(placementControlInfo);
    }
  });

  return placementInfoList;
};

const createProtectedAppMap = (
  application: ApplicationKind,
  clusterName: string,
  subscriptionGroupsList: SubscriptionGroupType[]
): ProtectedAppsMap => {
  const applicationNamespace = getNamespace(application);
  const protectedApp: ProtectedAppsMap = {
    appName: getName(application),
    appNamespace: applicationNamespace,
    appKind: application?.kind,
    appAPIVersion: application?.apiVersion,
    appType: DRApplication.SUBSCRIPTION,
    placementControlInfo: createPlacementControlInfoList(
      subscriptionGroupsList,
      clusterName,
      applicationNamespace
    ),
  };

  return protectedApp;
};

const createClusterWiseSubscriptionGroupsMap = (
  subscriptionGroupInfo: SubscriptionGroupType[]
): ClusterWiseSubscriptionGroupsMap => {
  const clusterWiseSubscriptionGroups: ClusterWiseSubscriptionGroupsMap = {};

  subscriptionGroupInfo?.forEach((subscriptionGroup) => {
    const appPlacement = (
      subscriptionGroup?.placement?.kind === ACMPlacementModel.kind
        ? subscriptionGroup?.placementDecision
        : subscriptionGroup?.placement
    ) as ACMPlacementDecisionKind;
    const deploymentClusters: string[] = findDeploymentClusters(
      appPlacement,
      subscriptionGroup?.drInfo?.drPlacementControl
    );

    deploymentClusters?.forEach((decisionCluster) => {
      clusterWiseSubscriptionGroups[decisionCluster] =
        clusterWiseSubscriptionGroups[decisionCluster] || [];
      clusterWiseSubscriptionGroups[decisionCluster].push(subscriptionGroup);
    });
  });

  return clusterWiseSubscriptionGroups;
};

export const useSubscriptionParser: UseSubscriptionParser = (
  managedClusters,
  managedClusterLoaded,
  managedClusterLoadError
) => {
  const [drResources, drLoaded, drLoadError] =
    useDisasterRecoveryResourceWatch();

  const [subscriptionResources, subsResourceLoaded, subsResourceLoadError] =
    useSubscriptionResourceWatch({
      drResources: {
        data: drResources,
        loaded: drLoaded,
        loadError: drLoadError,
      },
    });

  const loaded = subsResourceLoaded && managedClusterLoaded;
  const loadError = subsResourceLoadError || managedClusterLoadError;
  const drClusters: DRClusterKind[] = drResources?.drClusters;
  const drClusterAppsMap: DRClusterAppsMap = React.useMemo(() => {
    if (loaded && !loadError) {
      const drClusterAppsMap: DRClusterAppsMap = drClusters.reduce(
        (acc, drCluster) => {
          const clusterName = getName(drCluster);
          acc[clusterName] = {
            totalManagedAppsCount: 0,
            protectedApps: [],
            managedCluster: managedClusters.find(
              (managedCluster) => getName(managedCluster) === clusterName
            ),
          };
          return acc;
        },
        {} as DRClusterAppsMap
      );

      subscriptionResources.forEach((subscriptionResource) => {
        const { application, subscriptionGroupInfo } =
          subscriptionResource || {};

        const clusterWiseSubscriptionGroups =
          createClusterWiseSubscriptionGroupsMap(subscriptionGroupInfo);

        Object.entries(clusterWiseSubscriptionGroups).forEach(
          ([clusterName, subscriptionGroupsList]) => {
            if (clusterName in drClusterAppsMap) {
              drClusterAppsMap[clusterName].totalManagedAppsCount += 1;
              const protectedApp = createProtectedAppMap(
                application,
                clusterName,
                subscriptionGroupsList
              );

              if (!!protectedApp.placementControlInfo.length) {
                drClusterAppsMap[clusterName].protectedApps.push(protectedApp);
              }
            }
          }
        );
      });
      return drClusterAppsMap;
    }

    return {};
  }, [subscriptionResources, managedClusters, drClusters, loaded, loadError]);

  return [drClusterAppsMap, loaded, loadError];
};

type UseSubscriptionParserResult = [DRClusterAppsMap, boolean, any];

type UseSubscriptionParser = (
  managedClusters: ACMManagedClusterKind[],
  managedClusterLoaded: boolean,
  managedClusterLoadError: any
) => UseSubscriptionParserResult;

type ClusterWiseSubscriptionGroupsMap = {
  [clusterName: string]: SubscriptionGroupType[];
};
