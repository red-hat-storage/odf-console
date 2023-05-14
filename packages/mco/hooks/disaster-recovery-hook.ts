import * as React from 'react';
import { getAPIVersion, getNamespace } from '@odf/shared/selectors';
import { DRClusterStatus } from '../components/modals/app-failover-relocate/subscriptions/target-cluster-selector';
import { DRPC_STATUS } from '../constants';
import { DRPolicyKind, DRClusterKind, DRPlacementControlKind } from '../types';
import {
  filerDRClustersUsingDRPolicy,
  findDRPolicyUsingDRPC,
  findDRType,
  isDRPCAvailable,
  isPeerReady,
} from '../utils';
import { DisasterRecoveryInfoType, DRClusterInfo } from './types';

const getDRClusterInfo = (drClusterInfo: DRClusterKind[]): DRClusterInfo[] =>
  drClusterInfo?.map((clusterInfo) => ({
    apiVersion: getAPIVersion(clusterInfo),
    kind: clusterInfo?.kind,
    metadata: clusterInfo?.metadata,
    status: {
      phase: clusterInfo?.status?.phase as DRClusterStatus,
    },
  }));

export const useDisasterRecoveryinfoParser: UeDisasterRecoveryinfoParser = (
  props
) => {
  const { drClusters, drPlacementControls, drPolicies, loaded, loadError } =
    props;

  return React.useMemo(() => {
    let disasterRecoveryInfo: DisasterRecoveryInfoType[] = [];
    if (loaded && !loadError) {
      drPlacementControls.forEach((drpc) => {
        const drPolicy = findDRPolicyUsingDRPC(drpc, drPolicies);
        const filtereDRClusters = filerDRClustersUsingDRPolicy(
          drPolicy,
          drClusters
        );
        disasterRecoveryInfo.push({
          apiVersion: getAPIVersion(drpc),
          kind: drpc?.kind,
          metadata: drpc?.metadata,
          failoverCluster: drpc?.spec?.failoverCluster,
          preferedCluster: drpc?.spec?.preferredCluster,
          action: drpc?.spec?.action,
          policyInfo: !!drPolicy
            ? {
                apiVersion: getAPIVersion(drPolicy),
                kind: drPolicy?.kind,
                metadata: drPolicy?.metadata,
                replicationType: findDRType(filtereDRClusters),
              }
            : {},
          placementInfo: {
            ...(drpc?.spec?.placementRef || {}),
            namespace:
              drpc?.spec?.placementRef?.namespace || getNamespace(drpc),
          },
          status: {
            isPeerReady: isPeerReady(drpc),
            isAvailable: isDRPCAvailable(drpc),
            phase: drpc?.status?.phase as DRPC_STATUS,
            lastGroupSyncTime: drpc?.status?.lastGroupSyncTime,
          },
          drClusterInfo: !!filtereDRClusters
            ? getDRClusterInfo(filtereDRClusters)
            : [],
        });
      });
    }
    return disasterRecoveryInfo;
  }, [drPolicies, drClusters, drPlacementControls, loaded, loadError]);
};

type DRResourceParserType = {
  drPlacementControls?: DRPlacementControlKind[];
  drPolicies?: DRPolicyKind[];
  drClusters?: DRClusterKind[];
  loaded: boolean;
  loadError: boolean;
};

export type UeDisasterRecoveryinfoParser = (
  props?: DRResourceParserType
) => DisasterRecoveryInfoType[];
