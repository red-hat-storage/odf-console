import * as React from 'react';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
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

const ACTIVE_PHASES = [
  Phase.Initiating,
  Phase.Deploying,
  Phase.FailingOver,
  Phase.Relocating,
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
 * Hook to get active DR operations (failover/relocate) grouped by cluster pairs.
 * Uses deep comparison memoization on inputs to prevent unnecessary re-computation.
 */
export const useActiveDROperations = (): [
  ClusterPairOperationsMap,
  boolean,
  Error | null,
] => {
  const [pavs, pavsLoaded, pavsLoadError] = useK8sWatchResource<
    ProtectedApplicationViewKind[]
  >(getProtectedApplicationViewResourceObj());

  const [drpcs, drpcsLoaded, drpcsLoadError] = useK8sWatchResource<
    DRPlacementControlKind[]
  >(getDRPlacementControlResourceObj());

  // Deep compare inputs to prevent re-computation when data hasn't actually changed
  // useK8sWatchResource may return new array references even when content is the same
  const memoizedPavs = useDeepCompareMemoize(pavs);
  const memoizedDrpcs = useDeepCompareMemoize(drpcs);

  // Compute operations map - only re-runs when memoized inputs actually change
  const clusterPairOperationsMap = React.useMemo(() => {
    const operationsMap: ClusterPairOperationsMap = {};

    if (pavsLoaded && drpcsLoaded && !pavsLoadError && !drpcsLoadError) {
      // Create a map of DRPC name to PAV for quick lookup
      const pavByDRPC = new Map<string, ProtectedApplicationViewKind>();
      memoizedPavs?.forEach((pav) => {
        const drpcName = pav.spec?.drpcRef?.name;
        if (drpcName) {
          pavByDRPC.set(drpcName, pav);
        }
      });

      // Process each DRPC to find active operations
      memoizedDrpcs?.forEach((drpc) => {
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

        // Get associated PAV
        const pav = pavByDRPC.get(drpcName);
        const applicationName = pav?.metadata?.name || drpcName;
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
    }

    return operationsMap;
  }, [
    memoizedPavs,
    memoizedDrpcs,
    pavsLoaded,
    drpcsLoaded,
    pavsLoadError,
    drpcsLoadError,
  ]);

  // Memoize return array to ensure stable reference
  return React.useMemo(
    () => [
      clusterPairOperationsMap,
      pavsLoaded && drpcsLoaded,
      pavsLoadError || drpcsLoadError,
    ],
    [
      clusterPairOperationsMap,
      pavsLoaded,
      drpcsLoaded,
      pavsLoadError,
      drpcsLoadError,
    ]
  );
};
