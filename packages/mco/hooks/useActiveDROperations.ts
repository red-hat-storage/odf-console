import { getName, getNamespace } from '@odf/shared/selectors';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { DRActionType } from '../constants';
import { DISCOVERED_APP_NS } from '../constants';
import {
  DRPlacementControlKind,
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
  phase: string;
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

  // Active phases
  const activePhases = ['Initiating', 'Deploying', 'FailingOver', 'Relocating'];

  return phase ? activePhases.includes(phase) : false;
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

  const clusterPairOperationsMap: ClusterPairOperationsMap = {};

  if (pavsLoaded && drpcsLoaded && !pavsLoadError && !drpcsLoadError) {
    // Create a map of DRPC name to PAV for quick lookup
    const pavByDRPC = new Map<string, ProtectedApplicationViewKind>();
    pavs?.forEach((pav) => {
      const drpcName = pav.spec?.drpcRef?.name;
      if (drpcName) {
        pavByDRPC.set(drpcName, pav);
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

      // Get associated PAV
      const pav = pavByDRPC.get(drpcName);
      const applicationName = pav?.metadata?.name || drpcName;
      const isDiscoveredApp = drpcNamespace === DISCOVERED_APP_NS;

      // Determine source and target clusters
      let sourceCluster: string;
      let targetCluster: string;

      if (action === DRActionType.FAILOVER && failoverCluster) {
        // Failover: moving from current to failover cluster
        sourceCluster = pav?.status?.drInfo?.primaryCluster || preferredCluster;
        targetCluster = failoverCluster;
      } else if (action === DRActionType.RELOCATE && preferredCluster) {
        // Relocate: moving back to preferred cluster
        sourceCluster = pav?.status?.drInfo?.primaryCluster;
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

      if (!clusterPairOperationsMap[pairKey]) {
        clusterPairOperationsMap[pairKey] = [];
      }
      clusterPairOperationsMap[pairKey].push(operation);
    });
  }

  return [
    clusterPairOperationsMap,
    pavsLoaded && drpcsLoaded,
    pavsLoadError || drpcsLoadError,
  ];
};
