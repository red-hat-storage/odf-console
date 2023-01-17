import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { HUB_CLUSTER_NAME } from '../constants';
import {
  ACMPlacementModel,
  ACMPlacementDecisionModel,
  ArgoApplicationSetModel,
  ACMManagedClusterModel,
} from '../models';
import {
  ArgoApplicationSetKind,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  ACMManagedClusterKind,
} from '../types';
import {
  findSiblingArgoAppSetsFromPlacement,
  findPlacementFromArgoAppSet,
  findPlacementDecisionUsingPlacement,
  findDRResourceUsingPlacement,
  filerManagedClusterUsingDRClusters,
} from '../utils';
import {
  useDisasterRecoveryResourceWatch,
  DisasterRecoveryResourceKind,
} from './disaster-recovery';

const resources = (namespace?: string) => ({
  applications: {
    ...(!!namespace ? { namespace } : {}),
    kind: referenceForModel(ArgoApplicationSetModel),
    isList: true,
    namespaced: !!namespace,
    optional: true,
    cluster: HUB_CLUSTER_NAME,
  },
  placements: {
    ...(!!namespace ? { namespace } : {}),
    kind: referenceForModel(ACMPlacementModel),
    isList: true,
    namespaced: !!namespace,
    optional: true,
    cluster: HUB_CLUSTER_NAME,
  },
  placementDecisions: {
    ...(!!namespace ? { namespace } : {}),
    kind: referenceForModel(ACMPlacementDecisionModel),
    isList: true,
    namespaced: !!namespace,
    optional: true,
    cluster: HUB_CLUSTER_NAME,
  },
  managedClusters: {
    kind: referenceForModel(ACMManagedClusterModel),
    isList: true,
    optional: true,
    namespaced: false,
    cluster: HUB_CLUSTER_NAME,
  },
});

export const useArgoApplicationSetResourceWatch: UseArgoApplicationSetResourceWatch =
  (resource) => {
    const [drResources, drLoaded, drLoadError] =
      useDisasterRecoveryResourceWatch(resource);
    const response = useK8sWatchResources<WatchResourceType>(
      resources(resource?.namespace)
    );

    const {
      data: placements,
      loaded: placementsLoaded,
      loadError: placementsLoadError,
    } = response?.placements;

    const {
      data: placementDecisions,
      loaded: placementDecisionsLoaded,
      loadError: placementDecisionsLoadError,
    } = response?.placementDecisions;

    const {
      data: applications,
      loaded: applicationsLoaded,
      loadError: applicationsLoadError,
    } = response?.applications;

    const {
      data: managedClusters,
      loaded: managedClustersLoaded,
      loadError: managedClustersLoadedError,
    } = response?.managedClusters;

    const appName = resource?.name;

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
      const argoApplicationSetResources: ArgoApplicationSetResourceKind[] = [];
      if (loaded && !loadError) {
        applications.forEach((application) => {
          if (!appName || getName(application) === appName) {
            const placement = findPlacementFromArgoAppSet(
              placements,
              application
            );
            const drResource = findDRResourceUsingPlacement(
              placement,
              drResources
            );
            argoApplicationSetResources.push({
              application,
              placement,
              siblingApplications: findSiblingArgoAppSetsFromPlacement(
                appName,
                placement,
                applications
              ),
              placementDecision: findPlacementDecisionUsingPlacement(
                placement,
                placementDecisions
              ),
              managedClusters: filerManagedClusterUsingDRClusters(
                drResource?.drClusters,
                managedClusters
              ),
              ...drResource,
            });
          }
        });
      }

      return [argoApplicationSetResources, loaded, loadError];
    }, [
      applications,
      placements,
      placementDecisions,
      drResources,
      managedClusters,
      appName,
      loaded,
      loadError,
    ]);
  };

type WatchResourceType = {
  applications: ArgoApplicationSetKind[];
  placements: ACMPlacementKind[];
  placementDecisions: ACMPlacementDecisionKind[];
  managedClusters: ACMManagedClusterKind[];
};

export type UseArgoApplicationSetResourceWatch = (
  resource?: {
    name?: string;
    namespace?: string;
  } | null
) => [ArgoApplicationSetResourceKind[], boolean, any];

export type ArgoApplicationSetResourceKind = DisasterRecoveryResourceKind & {
  application: ArgoApplicationSetKind;
  siblingApplications: ArgoApplicationSetKind[];
  placement: ACMPlacementKind;
  placementDecision: ACMPlacementDecisionKind;
  managedClusters: ACMManagedClusterKind[];
};
