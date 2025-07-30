import { BackendType, ReplicationType } from '@odf/mco/constants';
import { Provider } from '@odf/mco/hooks/use-storage-providers';
import { ConnectedClient } from '@odf/mco/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type StorageClassEntry = { name: string; provisioner: string };

export type StorageClusterInfoType = {
  // Namespaced storage cluster name.
  storageClusterNamespacedName: string;
  // Ceph FSID to determine RDR/MDR.
  cephFSID: string;
  // ToDo: Use list type after ODF starts supporting
  // multiple clients per managed cluster
  clientInfo?: ConnectedClient;
  // Deployment type of ODF cluster internal/external
  deploymentType: string;
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

// Using K8sResourceCommon to reuse shared components
export type ManagedClusterInfoType = K8sResourceCommon & {
  // Cluster id
  id: string;
  // Cluster is offline / online.
  isManagedClusterAvailable: boolean;
  // ODF cluster info.
  // ToDo: Use list type after ODF starts supporting
  // multiple ODF clusters per managed cluster
  odfInfo?: ODFConfigInfoType;
  providers?: Provider[];
};

type S3Details = {
  clusterName: string;
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretKey: string;
  region: string;
  s3ProfileName: string;
};

export type DRPolicyState = {
  // DRPolicy CR name.
  policyName: string;
  // DRPolicy type Async / Sync.
  replicationType: ReplicationType;

  replicationBackend: BackendType;

  cluster1S3Details: S3Details;
  cluster2S3Details: S3Details;
  useSameS3Connection: boolean;

  // Sync interval schedule for Async policy.
  syncIntervalTime: string;
  // Selected managed cluster for DRPolicy paring.
  selectedClusters: ManagedClusterInfoType[];
  // For RBD cloned PVC
  enableRBDImageFlatten: boolean;
  // Any error to block the creation
  isClusterSelectionValid: boolean;
};

export enum DRPolicyActionType {
  SET_POLICY_NAME = 'SET_POLICY_NAME',
  SET_REPLICATION_BACKEND = 'SET_REPLICATION_BACKEND',
  SET_REPLICATION_TYPE = 'SET_REPLICATION_TYPE',
  SET_SYNC_INTERVAL_TIME = 'SET_SYNC_INTERVAL_TIME',
  SET_SELECTED_CLUSTERS = 'SET_SELECTED_CLUSTERS',
  UPDATE_SELECTED_CLUSTERS = 'UPDATE_SELECTED_CLUSTERS',
  SET_RBD_IMAGE_FLATTEN = 'SET_RBD_IMAGE_FLATTEN',
  SET_CLUSTER_SELECTION_VALIDATION = 'SET_CLUSTER_SELECTION_VALIDATION',
  SET_CLUSTER1_S3_DETAILS = 'SET_CLUSTER1_S3_DETAILS',
  SET_CLUSTER2_S3_DETAILS = 'SET_CLUSTER2_S3_DETAILS',
  SET_USE_SAME_S3_CONNECTION = 'SET_USE_SAME_S3_CONNECTION',
  SET_COMMON_STORAGE_CLASS = 'SET_COMMON_STORAGE_CLASS',
}

export const drPolicyInitialState: DRPolicyState = {
  policyName: '',
  replicationType: null,
  replicationBackend: BackendType.DataFoundation,
  cluster1S3Details: {
    clusterName: '',
    bucketName: '',
    endpoint: '',
    accessKeyId: '',
    secretKey: '',
    region: '',
    s3ProfileName: '',
  },
  cluster2S3Details: {
    clusterName: '',
    bucketName: '',
    endpoint: '',
    accessKeyId: '',
    secretKey: '',
    region: '',
    s3ProfileName: '',
  },
  useSameS3Connection: false,
  syncIntervalTime: '5m',
  selectedClusters: [],
  enableRBDImageFlatten: false,
  isClusterSelectionValid: false,
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
    };

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
    case DRPolicyActionType.SET_REPLICATION_BACKEND: {
      return {
        ...state,
        replicationBackend: action.payload,
      };
    }
    case DRPolicyActionType.SET_CLUSTER1_S3_DETAILS:
      return { ...state, cluster1S3Details: action.payload };
    case DRPolicyActionType.SET_CLUSTER2_S3_DETAILS:
      return { ...state, cluster2S3Details: action.payload };
    case DRPolicyActionType.SET_USE_SAME_S3_CONNECTION:
      return { ...state, useSameS3Connection: action.payload };
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
    case DRPolicyActionType.SET_CLUSTER_SELECTION_VALIDATION: {
      return {
        ...state,
        isClusterSelectionValid: action.payload,
      };
    }
    default:
      return state;
  }
};
