import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationType, DRActionType } from '../constants';
import {
  DRPlacementControlKind,
  Phase,
  Progression,
  ProtectedApplicationViewKind,
} from '../types';
import {
  getDRPlacementControlResourceObj,
  getProtectedApplicationViewResourceObj,
} from './mco-resources';
import {
  createClusterPairKey,
  ClusterPairKey,
} from './useDRPoliciesByClusterPair';

export type ActiveDROperation = {
  applicationName: string;
  applicationNamespace: string;
  action: DRActionType;
  progression: Progression;
  phase: Phase;
  actionStartTime?: string;
  sourceCluster?: string;
  targetCluster?: string;
  drpcName: string;
  isDiscoveredApp: boolean;
  pav?: ProtectedApplicationViewKind;
  drpc?: DRPlacementControlKind;
};

export type ClusterPairOperationsMap = {
  [pairKey: ClusterPairKey]: ActiveDROperation[];
};

// Active phases - includes WaitForUser since user action is still part of active operation
const ACTIVE_PHASES = [
  Phase.Initiating,
  Phase.Deploying,
  Phase.FailingOver,
  Phase.Relocating,
  Phase.WaitForUser, // User action required - still an active operation
];
/**
 * Determines if a DRPC has an active operation in progress
 */
const isActiveOperation = (drpc: DRPlacementControlKind): boolean => {
  const phase = drpc.status?.phase;
  const progression = drpc.status?.progression;

  // Active if progression exists and is not completed
  if (progression && progression !== Progression.Completed) {
    return true;
  }

  return phase ? ACTIVE_PHASES.includes(phase) : false;
};

/**
 * Hook to get active DR operations (failover/relocate) grouped by cluster pairs
 */
export const useActiveDROperations = (): [
  ClusterPairOperationsMap,
  boolean,
  any,
] => {
  const [pavs, pavsLoaded, pavsLoadError] = useK8sWatchResource<
    ProtectedApplicationViewKind[]
  >(getProtectedApplicationViewResourceObj());

  const [drpcs, drpcsLoaded, drpcsLoadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj());

  const clusterPairOperationsMap: ClusterPairOperationsMap =
    React.useMemo(() => {
      const operationsMap: ClusterPairOperationsMap = {};

      if (!pavsLoaded || !drpcsLoaded || pavsLoadError || drpcsLoadError) {
        return operationsMap;
      }

      // Create a map of DRPC namespaced name to PAV for quick lookup
      const pavByDRPC = new Map<string, ProtectedApplicationViewKind>();
      pavs?.forEach((pav) => {
        const drpcName = pav.spec?.drpcRef?.name;
        const drpcNamespace = pav.spec?.drpcRef?.namespace;
        if (drpcName && drpcNamespace) {
          pavByDRPC.set(`${drpcName}:${drpcNamespace}`, pav);
        }
      });

      // Process each DRPC to find active operations
      drpcs?.forEach((drpc) => {
        if (!isActiveOperation(drpc)) {
          return;
        }

        const drpcName = getName(drpc);
        const drpcNamespace = getNamespace(drpc);
        const action = drpc.spec?.action;
        const progression = drpc.status?.progression;
        const phase = drpc.status?.phase;
        const actionStartTime = drpc.status?.actionStartTime;
        const preferredCluster = drpc.spec?.preferredCluster;
        const failoverCluster = drpc.spec?.failoverCluster;

        // Get associated PAV using namespaced name
        const pav = pavByDRPC.get(`${drpcName}:${drpcNamespace}`);
        const applicationName = getName(pav) || drpcName;
        // Check if discovered app from PAV applicationInfo type
        const isDiscoveredApp =
          pav?.status?.applicationInfo?.type === ApplicationType.Discovered;

        // Determine source and target clusters
        let sourceCluster: string;
        let targetCluster: string;

        if (action === DRActionType.FAILOVER && failoverCluster) {
          // Failover: moving from current to failover cluster
          sourceCluster =
            pav?.status?.drInfo?.primaryCluster || preferredCluster;
          targetCluster = failoverCluster;
        } else if (action === DRActionType.RELOCATE && preferredCluster) {
          // Relocate: moving back to preferred cluster
          // Use failoverCluster as source if primaryCluster is not available
          sourceCluster =
            pav?.status?.drInfo?.primaryCluster || failoverCluster;
          targetCluster = preferredCluster;
        } else {
          // Can't determine cluster pair, skip
          return;
        }

        // Only process if we have both source and target
        if (!sourceCluster || !targetCluster) {
          return;
        }

        const pairKey = createClusterPairKey(sourceCluster, targetCluster);

        const operation: ActiveDROperation = {
          applicationName,
          applicationNamespace: drpcNamespace,
          action,
          progression,
          phase,
          actionStartTime,
          sourceCluster,
          targetCluster,
          drpcName,
          isDiscoveredApp,
          pav,
          drpc,
        };

        if (!operationsMap[pairKey]) {
          operationsMap[pairKey] = [];
        }
        operationsMap[pairKey].push(operation);
      });

      return operationsMap;
    }, [pavs, drpcs, pavsLoaded, drpcsLoaded, pavsLoadError, drpcsLoadError]);

  return [
    clusterPairOperationsMap,
    pavsLoaded && drpcsLoaded,
    pavsLoadError || drpcsLoadError,
  ];
};
