/* To find only DR hierarchy*/

import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { WatchK8sResultsObject } from '@openshift-console/dynamic-plugin-sdk';
import {
  DRPolicyKind,
  DRClusterKind,
  DRPlacementControlKind,
  DRResourceType,
} from '../types';
import { filerDRClustersUsingDRPolicy, findDRPCUsingDRPolicy } from '../utils';

export const useDRResourceParser: UseDRResourceParserType = (props) => {
  const {
    data: drPolicies,
    loaded: drPoliciesLoaded,
    loadError: drPoliciesLoadError,
  } = props?.resources?.drPolicies || {};

  const {
    data: drClusters,
    loaded: drClustersLoaded,
    loadError: drClustersLoadError,
  } = props?.resources?.drClusters || {};

  const {
    data: drPlacementControls,
    loaded: drPlacementControlsLoaded,
    loadError: drPlacementControlsLoadError,
  } = props?.resources?.drPlacementControls || {};

  const loaded =
    drPoliciesLoaded && drClustersLoaded && drPlacementControlsLoaded;
  const loadError =
    drPoliciesLoadError || drClustersLoadError || drPlacementControlsLoadError;

  return React.useMemo(() => {
    let drResources: DRResourceType[] = [];
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
        const drpcs = findDRPCUsingDRPolicy(drpcList, getName(drPolicy));
        const filtereDRClusters = filerDRClustersUsingDRPolicy(
          drPolicy,
          drClusterList
        );
        drResources.push({
          drClusters: filtereDRClusters,
          drPolicy: drPolicy,
          drPlacementControls: drpcs,
        });
      });
    }
    return {
      data: drResources,
      loaded,
      loadError,
    };
  }, [drPolicies, drClusters, drPlacementControls, loaded, loadError]);
};

type WatchResources = {
  resources?: {
    drPolicies?: WatchK8sResultsObject<DRPolicyKind | DRPolicyKind[]>;
    drClusters?: WatchK8sResultsObject<DRClusterKind | DRClusterKind[]>;
    drPlacementControls?: WatchK8sResultsObject<
      DRPlacementControlKind | DRPlacementControlKind[]
    >;
  };
};

export type DRParserResultsType = {
  data: DRResourceType[];
  loaded: boolean;
  loadError: any;
};

export type UseDRResourceParserType = (
  resource?: WatchResources
) => DRParserResultsType;
