import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  useK8sWatchResources,
  WatchK8sResource,
  WatchK8sResultsObject,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  ArgoApplicationSetKind,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  ACMManagedClusterKind,
  DRPlacementControlKind,
  DRPolicyKind,
  DRClusterKind,
} from '../types';
import {
  findSiblingArgoAppSetsFromPlacement,
  findPlacementFromArgoAppSet,
  findPlacementDecisionUsingPlacement,
  findDRResourceUsingPlacement,
  filerManagedClusterUsingDRClusters,
} from '../utils';
import { DisasterRecoveryResourceKind } from './disaster-recovery';
import {
  getApplicationSetResourceObj,
  getManagedClusterResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
} from './mco-resources';

const getResources = () => ({
  managedClusters: getManagedClusterResourceObj(),
  applications: getApplicationSetResourceObj(),
  placements: getPlacementResourceObj(),
  placementDecisions: getPlacementDecisionsResourceObj(),
});

export const useArgoApplicationSetResourceWatch: UseArgoApplicationSetResourceWatch =
  (resource) => {
    const response = useK8sWatchResources<WatchResourceType>(
      resource?.resources || getResources()
    );

    const {
      data: placements,
      loaded: placementsLoaded,
      loadError: placementsLoadError,
    } = response?.placements || resource?.overrides?.placements || {};

    const {
      data: placementDecisions,
      loaded: placementDecisionsLoaded,
      loadError: placementDecisionsLoadError,
    } = response?.placementDecisions ||
    resource?.overrides?.placementDecisions ||
    {};

    const {
      data: applications,
      loaded: applicationsLoaded,
      loadError: applicationsLoadError,
    } = response?.applications || resource?.overrides?.applications || {};

    const {
      data: managedClusters,
      loaded: managedClustersLoaded,
      loadError: managedClustersLoadedError,
    } = response?.managedClusters || resource?.overrides?.managedClusters || {};

    const {
      data: drResources,
      loaded: drLoaded,
      loadError: drLoadError,
    } = resource?.drResources || {};

    const filterByAppName = resource?.conditions?.filterByAppName;

    const loaded =
      placementsLoaded &&
      placementDecisionsLoaded &&
      applicationsLoaded &&
      managedClustersLoaded &&
      drLoaded;

    const loadError =
      placementsLoadError ||
      placementDecisionsLoadError ||
      applicationsLoadError ||
      managedClustersLoadedError ||
      drLoadError;

    return React.useMemo(() => {
      let argoApplicationSetResources: ArgoApplicationSetResourceKind = {};
      const argoApplicationSetFormatted: ArgoApplicationSetFormattedKind[] = [];
      if (loaded && !loadError) {
        const appList = Array.isArray(applications)
          ? applications
          : [applications];
        const placementList = Array.isArray(placements)
          ? placements
          : [placements];
        const placementDecisionList = Array.isArray(placementDecisions)
          ? placementDecisions
          : [placementDecisions];
        const managedClusterList = Array.isArray(managedClusters)
          ? managedClusters
          : [managedClusters];
        appList.forEach((application) => {
          if (!filterByAppName || getName(application) === filterByAppName) {
            // For now ACM is supporting one placement per ApplicationSet
            const placement = findPlacementFromArgoAppSet(
              placementList,
              application
            );
            const drResource = findDRResourceUsingPlacement(
              getName(placement),
              getNamespace(placement),
              drResources?.formattedResources
            );
            argoApplicationSetFormatted.push({
              application,
              placements: [
                {
                  placement,
                  placementDecision: findPlacementDecisionUsingPlacement(
                    placement,
                    placementDecisionList
                  ),
                  drPolicy: drResource?.drPolicy,
                  drClusters: drResource?.drClusters,
                  drPlacementControl: drResource?.drPlacementControls?.[0],
                },
              ],
              siblingApplications: findSiblingArgoAppSetsFromPlacement(
                filterByAppName,
                placement,
                appList
              ),
              managedClusters: filerManagedClusterUsingDRClusters(
                drResource?.drClusters,
                managedClusterList
              ),
            });
          }
        });
        argoApplicationSetResources = {
          formattedResources: argoApplicationSetFormatted,
          managedClusters: managedClusterList,
        };
      }

      return [argoApplicationSetResources, loaded, loadError];
    }, [
      applications,
      placements,
      placementDecisions,
      drResources,
      managedClusters,
      filterByAppName,
      loaded,
      loadError,
    ]);
  };

type WatchResourceType = {
  applications?: ArgoApplicationSetKind | ArgoApplicationSetKind[];
  placements?: ACMPlacementKind | ACMPlacementKind[];
  placementDecisions?: ACMPlacementDecisionKind | ACMPlacementDecisionKind[];
  managedClusters?: ACMManagedClusterKind | ACMManagedClusterKind[];
};

type WatchResources = {
  resources?: {
    applications?: WatchK8sResource;
    placements?: WatchK8sResource;
    placementDecisions?: WatchK8sResource;
    managedClusters?: WatchK8sResource;
  };
  conditions?: {
    filterByAppName: string;
  };
  overrides?: {
    applications?: WatchK8sResultsObject<ArgoApplicationSetKind>;
    placements?: WatchK8sResultsObject<ACMPlacementKind>;
    placementDecisions?: WatchK8sResultsObject<ACMPlacementDecisionKind>;
    managedClusters?: WatchK8sResultsObject<ACMManagedClusterKind>;
  };
  drResources?: {
    data: DisasterRecoveryResourceKind;
    loaded: boolean;
    loadError: any;
  };
};

export type UseArgoApplicationSetResourceWatch = (
  resource?: WatchResources
) => [ArgoApplicationSetResourceKind, boolean, any];

export type ArgoApplicationSetFormattedKind = {
  application: ArgoApplicationSetKind;
  placements: {
    placement: ACMPlacementKind;
    placementDecision: ACMPlacementDecisionKind;
    drPlacementControl: DRPlacementControlKind;
    drPolicy: DRPolicyKind;
    drClusters: DRClusterKind[];
  }[];
  siblingApplications: ArgoApplicationSetKind[];
  managedClusters: ACMManagedClusterKind[];
};

export type ArgoApplicationSetResourceKind = {
  formattedResources?: ArgoApplicationSetFormattedKind[];
  managedClusters?: ACMManagedClusterKind[];
};
