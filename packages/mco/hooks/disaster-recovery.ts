import * as React from 'react';
import {
  useK8sWatchResources,
  WatchK8sResource,
  WatchK8sResultsObject,
} from '@openshift-console/dynamic-plugin-sdk';
import { DRPolicyKind, DRClusterKind, DRPlacementControlKind } from '../types';
import { filerDRClustersUsingDRPolicy, findDRPCUsingDRPolicy } from '../utils';
import {
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
} from './mco-resources';

const getResources = () => ({
  drClusters: getDRClusterResourceObj(),
  drPolicies: getDRPolicyResourceObj(),
  drPlacementControls: getDRPlacementControlResourceObj(),
});

export const useDisasterRecoveryResourceWatch: UseDisasterRecoveryResourceWatch =
  (resource) => {
    const response = useK8sWatchResources<WatchResourceType>(
      resource?.resources || getResources()
    );

    const {
      data: drPolicies,
      loaded: drPoliciesLoaded,
      loadError: drPoliciesLoadError,
    } = response?.drPolicies || resource?.overrides?.drPolicies || {};

    const {
      data: drClusters,
      loaded: drClustersLoaded,
      loadError: drClustersLoadError,
    } = response?.drClusters || resource?.overrides?.drClusters || {};

    const {
      data: drPlacementControls,
      loaded: drPlacementControlsLoaded,
      loadError: drPlacementControlsLoadError,
    } = response?.drPlacementControls ||
    resource?.overrides?.drPlacementControls ||
    {};

    const loaded =
      drPoliciesLoaded && drClustersLoaded && drPlacementControlsLoaded;
    const loadError =
      drPoliciesLoadError ||
      drClustersLoadError ||
      drPlacementControlsLoadError;

    return React.useMemo(() => {
      let disasterRecoveryResources: DisasterRecoveryResourceKind = {};
      const disasterRecoveryFormatted: DisasterRecoveryFormatted[] = [];
      if (loaded && !loadError) {
        const drPolicyList = Array.isArray(drPolicies)
          ? drPolicies
          : [drPolicies];
        const drClusterList = Array.isArray(drClusters)
          ? drClusters
          : [drClusters];
        const drpcList = Array.isArray(drPlacementControls)
          ? drPlacementControls
          : [drPlacementControls];
        drPolicyList.forEach((drPolicy) => {
          const drpcs = findDRPCUsingDRPolicy(drpcList, drPolicy);
          const filtereDRClusters = filerDRClustersUsingDRPolicy(
            drPolicy,
            drClusterList
          );
          disasterRecoveryFormatted.push({
            drClusters: filtereDRClusters,
            drPolicy: drPolicy,
            drPlacementControls: drpcs,
          });
        });
        disasterRecoveryResources = {
          formattedResources: disasterRecoveryFormatted,
          drClusters: drClusterList,
          drPolicies: drPolicyList,
          drPlacementControls: drpcList,
        };
      }
      return [disasterRecoveryResources, loaded, loadError];
    }, [drPolicies, drClusters, drPlacementControls, loaded, loadError]);
  };

type WatchResourceType = {
  drPolicies?: DRPolicyKind | DRPolicyKind[];
  drClusters?: DRClusterKind | DRClusterKind[];
  drPlacementControls?: DRPlacementControlKind | DRPlacementControlKind[];
};

type WatchResources = {
  resources?: {
    drPolicies?: WatchK8sResource;
    drClusters?: WatchK8sResource;
    drPlacementControls?: WatchK8sResource;
  };
  overrides?: {
    drPolicies?: WatchK8sResultsObject<DRPolicyKind>;
    drClusters?: WatchK8sResultsObject<DRClusterKind>;
    drPlacementControls?: WatchK8sResultsObject<DRPlacementControlKind>;
  };
};

export type UseDisasterRecoveryResourceWatch = (
  resource?: WatchResources
) => [DisasterRecoveryResourceKind, boolean, any];

export type DisasterRecoveryFormatted = {
  drPlacementControls?: DRPlacementControlKind[];
  drPolicy?: DRPolicyKind;
  drClusters?: DRClusterKind[];
};

export type DisasterRecoveryResourceKind = {
  formattedResources?: DisasterRecoveryFormatted[];
  drPolicies?: DRPolicyKind[];
  drClusters?: DRClusterKind[];
  drPlacementControls?: DRPlacementControlKind[];
};
