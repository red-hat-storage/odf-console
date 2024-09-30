import { REPLICATION_TYPE } from '@odf/mco/constants';

export type StorageClusterInfoType = {
  // Namespaced storage cluster name.
  storageClusterNamespacedName: string;
  // Namespaced storage system name.
  storageSystemNamespacedName: string;
  // Ceph FSID to determine RDR/MDR.
  cephFSID: string;
  //  OSDs are migrated for the RDR or not.
  isDROptimized: boolean;
};

export type ODFConfigInfoType = {
  // ODF config info synced from managed cluster.
  storageClusterInfo: StorageClusterInfoType;
  // ODF version
  odfVersion: string;
  // ODF operator version has to be greater than or equal to MCO operator version.
  isValidODFVersion: boolean;
  // Count of storage clusters present under a OCP cluster.
  storageClusterCount: number;
};

export type ManagedClusterInfoType = {
  // Name of the managed cluster in ACM.
  name: string;
  // Namespace of the managed cluster deployed in ACM.
  namesapce: string;
  // The cloud region where the cluster is deployed.
  region?: string;
  // Cluster is offline / online.
  isManagedClusterAvailable: boolean;
  // ODF cluster info.
  odfInfo?: ODFConfigInfoType;
};

export type DRPolicyState = {
  // DRPolicy CR name.
  policyName: string;
  // DRPolicy type Async / Sync.
  replicationType: REPLICATION_TYPE;
  // Sync interval schedule for Async policy.
  syncIntervalTime: string;
  // Selected managed cluster for DRPolicy paring.
  selectedClusters: ManagedClusterInfoType[];
  enableRBDImageFlatten: boolean;
};

export enum DRPolicyActionType {
  SET_POLICY_NAME = 'SET_POLICY_NAME',
  SET_REPLICATION_TYPE = 'SET_REPLICATION_TYPE',
  SET_SYNC_INTERVAL_TIME = 'SET_SYNC_INTERVAL_TIME',
  SET_SELECTED_CLUSTERS = 'SET_SELECTED_CLUSTERS',
  UPDATE_SELECTED_CLUSTERS = 'UPDATE_SELECTED_CLUSTERS',
  SET_RBD_IMAGE_FLATTEN = 'SET_RBD_IMAGE_FLATTEN',
}

export const drPolicyInitialState: DRPolicyState = {
  policyName: '',
  replicationType: null,
  syncIntervalTime: '5m',
  selectedClusters: [],
  enableRBDImageFlatten: false,
};

export type DRPolicyAction =
  | { type: DRPolicyActionType.SET_POLICY_NAME; payload: string }
  | { type: DRPolicyActionType.SET_REPLICATION_TYPE; payload: REPLICATION_TYPE }
  | { type: DRPolicyActionType.SET_SYNC_INTERVAL_TIME; payload: string }
  | {
      type: DRPolicyActionType.SET_SELECTED_CLUSTERS;
      payload: ManagedClusterInfoType[];
    }
  | { type: DRPolicyActionType.SET_RBD_IMAGE_FLATTEN; payload: boolean };

export const drPolicyReducer = (
  state: DRPolicyState,
  action: DRPolicyAction
) => {
  switch (action.type) {
    case DRPolicyActionType.SET_POLICY_NAME: {
      return {
        ...state,
        policyName: action.payload,
      };
    }
    case DRPolicyActionType.SET_REPLICATION_TYPE: {
      return {
        ...state,
        replicationType: action.payload,
      };
    }
    case DRPolicyActionType.SET_SYNC_INTERVAL_TIME: {
      return {
        ...state,
        syncIntervalTime: action.payload,
      };
    }
    case DRPolicyActionType.SET_SELECTED_CLUSTERS: {
      return {
        ...state,
        selectedClusters: action.payload,
      };
    }
    case DRPolicyActionType.SET_RBD_IMAGE_FLATTEN: {
      return {
        ...state,
        enableRBDImageFlatten: action.payload,
      };
    }
    default:
      return state;
  }
};
