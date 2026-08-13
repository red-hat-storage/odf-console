import { BackendType, ReplicationType } from '@odf/mco/constants';
import { ManagedClusterInfoType, S3Details } from '@odf/mco/types';

export const emptyS3Details: S3Details = {
  clusterName: '',
  bucketName: '',
  endpoint: '',
  accessKeyId: '',
  secretKey: '',
  region: '',
  s3ProfileName: '',
};

export type DRPolicyState = {
  clusters: {
    // Selected managed cluster for DRPolicy paring.
    selectedClusters: ManagedClusterInfoType[];
    // Any error to block the creation
    isClusterSelectionValid: boolean;
    selectedClustersHaveODF: boolean;
  };
  configure: {
    replicationBackend: BackendType;
    cluster1S3Details: S3Details;
    cluster2S3Details: S3Details;
    useSameS3Connection: boolean;
  };
  policy: {
    // DRPolicy CR name.
    policyName: string;
    // DRPolicy type Async / Sync.
    replicationType: ReplicationType;
    // Sync interval schedule for Async policy.
    syncIntervalTime: string;
    // For RBD cloned PVC
    enableRBDImageFlatten: boolean;
  };
};

export enum DRPolicyActionType {
  SET_POLICY_NAME = 'SET_POLICY_NAME',
  SET_REPLICATION_BACKEND = 'SET_REPLICATION_BACKEND',
  SET_REPLICATION_TYPE = 'SET_REPLICATION_TYPE',
  SET_SYNC_INTERVAL_TIME = 'SET_SYNC_INTERVAL_TIME',
  SET_SELECTED_CLUSTERS = 'SET_SELECTED_CLUSTERS',
  SET_RBD_IMAGE_FLATTEN = 'SET_RBD_IMAGE_FLATTEN',
  SET_CLUSTER_SELECTION_VALIDATION = 'SET_CLUSTER_SELECTION_VALIDATION',
  SET_CLUSTER1_S3_DETAILS = 'SET_CLUSTER1_S3_DETAILS',
  SET_CLUSTER2_S3_DETAILS = 'SET_CLUSTER2_S3_DETAILS',
  SET_USE_SAME_S3_CONNECTION = 'SET_USE_SAME_S3_CONNECTION',
  SET_DO_CLUSTERS_HAVE_ODF = 'SET_DO_CLUSTERS_HAVE_ODF',
}

export const drPolicyInitialState: DRPolicyState = {
  clusters: {
    selectedClusters: [],
    selectedClustersHaveODF: false,
    isClusterSelectionValid: false,
  },
  configure: {
    replicationBackend: BackendType.DataFoundation,
    cluster1S3Details: { ...emptyS3Details },
    cluster2S3Details: { ...emptyS3Details },
    useSameS3Connection: false,
  },
  policy: {
    policyName: '',
    replicationType: null,
    syncIntervalTime: '5m',
    enableRBDImageFlatten: false,
  },
};

export type DRPolicyAction =
  | { type: DRPolicyActionType.SET_POLICY_NAME; payload: string }
  | { type: DRPolicyActionType.SET_REPLICATION_BACKEND; payload: BackendType }
  | { type: DRPolicyActionType.SET_REPLICATION_TYPE; payload: ReplicationType }
  | { type: DRPolicyActionType.SET_SYNC_INTERVAL_TIME; payload: string }
  | {
      type: DRPolicyActionType.SET_SELECTED_CLUSTERS;
      payload: ManagedClusterInfoType[];
    }
  | { type: DRPolicyActionType.SET_RBD_IMAGE_FLATTEN; payload: boolean }
  | {
      type: DRPolicyActionType.SET_CLUSTER_SELECTION_VALIDATION;
      payload: boolean;
    }
  | {
      type: DRPolicyActionType.SET_CLUSTER1_S3_DETAILS;
      payload: S3Details;
    }
  | {
      type: DRPolicyActionType.SET_CLUSTER2_S3_DETAILS;
      payload: S3Details;
    }
  | {
      type: DRPolicyActionType.SET_USE_SAME_S3_CONNECTION;
      payload: boolean;
    }
  | {
      type: DRPolicyActionType.SET_DO_CLUSTERS_HAVE_ODF;
      payload: boolean;
    };

export const drPolicyReducer = (
  state: DRPolicyState,
  action: DRPolicyAction
) => {
  switch (action.type) {
    case DRPolicyActionType.SET_POLICY_NAME: {
      return {
        ...state,
        policy: {
          ...state.policy,
          policyName: action.payload,
        },
      };
    }
    case DRPolicyActionType.SET_REPLICATION_BACKEND: {
      return {
        ...state,
        configure: {
          ...state.configure,
          replicationBackend: action.payload,
        },
      };
    }
    case DRPolicyActionType.SET_CLUSTER1_S3_DETAILS:
      return {
        ...state,
        configure: {
          ...state.configure,
          cluster1S3Details: action.payload,
        },
      };
    case DRPolicyActionType.SET_CLUSTER2_S3_DETAILS:
      return {
        ...state,
        configure: {
          ...state.configure,
          cluster2S3Details: action.payload,
        },
      };
    case DRPolicyActionType.SET_USE_SAME_S3_CONNECTION:
      return {
        ...state,
        configure: {
          ...state.configure,
          useSameS3Connection: action.payload,
        },
      };
    case DRPolicyActionType.SET_REPLICATION_TYPE: {
      return {
        ...state,
        policy: {
          ...state.policy,
          replicationType: action.payload,
        },
      };
    }
    case DRPolicyActionType.SET_SYNC_INTERVAL_TIME: {
      return {
        ...state,
        policy: {
          ...state.policy,
          syncIntervalTime: action.payload,
        },
      };
    }
    case DRPolicyActionType.SET_SELECTED_CLUSTERS: {
      return {
        ...state,
        clusters: {
          ...state.clusters,
          selectedClusters: action.payload,
        },
      };
    }
    case DRPolicyActionType.SET_RBD_IMAGE_FLATTEN: {
      return {
        ...state,
        policy: {
          ...state.policy,
          enableRBDImageFlatten: action.payload,
        },
      };
    }
    case DRPolicyActionType.SET_CLUSTER_SELECTION_VALIDATION: {
      return {
        ...state,
        clusters: {
          ...state.clusters,
          isClusterSelectionValid: action.payload,
        },
      };
    }
    case DRPolicyActionType.SET_DO_CLUSTERS_HAVE_ODF: {
      return {
        ...state,
        clusters: {
          ...state.clusters,
          selectedClustersHaveODF: action.payload,
        },
      };
    }
    default:
      return state;
  }
};
