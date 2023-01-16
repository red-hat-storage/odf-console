import * as React from 'react';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { HUB_CLUSTER_NAME } from '../constants';
import {
  DRPolicyModel,
  DRClusterModel,
  DRPlacementControlModel,
} from '../models';
import { DRPolicyKind, DRClusterKind, DRPlacementControlKind } from '../types';
import { filerDRClustersUsingDRPolicy, findDRPolicyUsingDRPC } from '../utils';

const resources = (namespace?: string) => ({
  drPolicies: {
    kind: referenceForModel(DRPolicyModel),
    namespaced: false,
    isList: true,
    optional: true,
    cluster: HUB_CLUSTER_NAME,
  },
  drPlacementControls: {
    ...(!!namespace ? { namespace } : {}),
    kind: referenceForModel(DRPlacementControlModel),
    namespaced: !!namespace,
    isList: true,
    optional: true,
    cluster: HUB_CLUSTER_NAME,
  },
  drClusters: {
    kind: referenceForModel(DRClusterModel),
    namespaced: false,
    isList: true,
    optional: true,
    cluster: HUB_CLUSTER_NAME,
  },
});

export const useDisasterRecoveryResourceWatch: UseDisasterRecoveryResourceWatch =
  (resource) => {
    const response = useK8sWatchResources<WatchResourceType>(
      resources(resource?.namespace)
    );

    const {
      data: drPolicies,
      loaded: drPoliciesLoaded,
      loadError: drPoliciesLoadError,
    } = response?.drPolicies;

    const {
      data: drClusters,
      loaded: drClustersLoaded,
      loadError: drClustersLoadError,
    } = response?.drClusters;

    const {
      data: drPlacementControls,
      loaded: drPlacementControlsLoaded,
      loadError: drPlacementControlsLoadError,
    } = response?.drPlacementControls;

    const loaded =
      drPoliciesLoaded && drClustersLoaded && drPlacementControlsLoaded;
    const loadError =
      drPoliciesLoadError ||
      drClustersLoadError ||
      drPlacementControlsLoadError;

    return React.useMemo(() => {
      const disasterRecoveryResources: DisasterRecoveryResourceKind[] = [];
      if (loaded && !loadError) {
        drPlacementControls.forEach((drPlacementControl) => {
          const drPolicy = findDRPolicyUsingDRPC(
            drPlacementControl,
            drPolicies
          );
          const filtereDRClusters = filerDRClustersUsingDRPolicy(
            drPolicy,
            drClusters
          );
          disasterRecoveryResources.push({
            drClusters: filtereDRClusters,
            drPolicy: drPolicy,
            drPlacementControl,
          });
        });
      }
      return [disasterRecoveryResources, loaded, loadError];
    }, [drPolicies, drClusters, drPlacementControls, loaded, loadError]);
  };

type WatchResourceType = {
  drPolicies: DRPolicyKind[];
  drClusters: DRClusterKind[];
  drPlacementControls: DRPlacementControlKind[];
};

export type UseDisasterRecoveryResourceWatch = (
  resource?: {
    namespace?: string;
  } | null
) => [DisasterRecoveryResourceKind[], boolean, any];

export type DisasterRecoveryResourceKind = {
  drPlacementControl: DRPlacementControlKind;
  drPolicy: DRPolicyKind;
  drClusters: DRClusterKind[];
};
