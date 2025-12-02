import { DefaultRequestSize } from '@odf/core/constants';
import { PoolType } from '@odf/ocs/constants';
import {
  blockPoolInitialState,
  StoragePoolState,
} from '@odf/ocs/storage-pool/reducer';
import { ReclaimPolicy, VolumeBindingMode } from '@odf/shared';

type StorageClassDetails = {
  reclaimPolicy: ReclaimPolicy;
  name: string;
  volumeBindingMode: VolumeBindingMode;
  enableStorageClassEncryption: boolean;
  encryptionKMSID: string;
};

type PoolDetails = {
  volumeType: string;
  poolName: string;
  dataProtectionPolicy: number;
  enableCompression: boolean;
  fileSystemName: string;
  failureDomain: string;
};

export type AttachStorageFormState = StoragePoolState & {
  lsoStorageClassName: string;
  enableEncryptionOnDeviceSet: boolean;
  poolType: PoolType;
  storageClassDetails: StorageClassDetails;
  deviceClass: string;
};

export type AttachStoragePayload = {
  storageClassForOSDs: string;
  storage: string;
  replica: number;
  count: number;
  storageClusterName: string;
  poolDetails: PoolDetails;
  storageClassDetails: StorageClassDetails;
  deviceClass: string;
  enableEncryption: boolean;
};

export const initialAttachStorageState: AttachStorageFormState = {
  ...blockPoolInitialState,
  lsoStorageClassName: '',
  enableEncryptionOnDeviceSet: false,
  poolType: PoolType.FILESYSTEM,
  storageClassDetails: {
    reclaimPolicy: ReclaimPolicy.Delete,
    name: '',
    volumeBindingMode: VolumeBindingMode.WaitForFirstConsumer,
    enableStorageClassEncryption: false,
    encryptionKMSID: '',
  },
  deviceClass: '',
};

export const createPayload = (
  state: AttachStorageFormState,
  storageClusterName: string,
  failureDomain: string,
  replica: number,
  fileSystemName: string,
  deviceSetCount: number
): AttachStoragePayload => {
  const dataProtectionPolicy = Number(state.replicaSize) || 0;
  const poolDetails: PoolDetails = {
    volumeType: state.poolType.toLocaleLowerCase(),
    poolName: state.poolName,
    dataProtectionPolicy: dataProtectionPolicy,
    enableCompression: state.isCompressed,
    fileSystemName,
    failureDomain,
  };

  const payload: AttachStoragePayload = {
    storageClassForOSDs: state.lsoStorageClassName,
    storage: DefaultRequestSize.BAREMETAL,
    replica: replica,
    count: deviceSetCount,
    storageClusterName,
    poolDetails: poolDetails,
    storageClassDetails: state.storageClassDetails,
    deviceClass: state.deviceClass,
    enableEncryption: state.enableEncryptionOnDeviceSet,
  };

  return payload;
};

export enum AttachStorageActionType {
  SET_POOL_NAME = 'SET_POOL_NAME',
  SET_POOL_TYPE = 'SET_POOL_TYPE',
  SET_POOL_STATUS = 'SET_POOL_STATUS',
  SET_POOL_REPLICA_SIZE = 'SET_POOL_REPLICA_SIZE',
  SET_POOL_COMPRESSED = 'SET_POOL_COMPRESSED',
  SET_POOL_ARBITER = 'SET_POOL_ARBITER',
  SET_FAILURE_DOMAIN = 'SET_FAILURE_DOMAIN',
  SET_INPROGRESS = 'SET_INPROGRESS',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
  SET_LSO_STORAGECLASS = 'SET_LSO_STORAGECLASS',
  SET_DEVICESET_ENCRYPTION = 'SET_DEVICESET_ENCRYPTION',
  SET_STORAGECLASS_NAME = 'SET_STORAGECLASS_NAME',
  SET_STORAGECLASS_ENCRYPTION = 'SET_STORAGECLASS_ENCRYPTION',
  SET_ENCRYPTION_KMS_ID = 'SET_ENCRYPTION_KMS_ID',
  SET_STORAGECLASS_RECLAIM_POLICY = 'SET_STORAGECLASS_RECLAIM_POLICY',
  SET_STORAGECLASS_VOLUME_BINDING_MODE = 'SET_STORAGECLASS_VOLUME_BINDING_MODE',
  SET_DEVICE_CLASS = 'SET_DEVICE_CLASS',
}

export type AttachStorageAction =
  | { type: AttachStorageActionType.SET_POOL_NAME; payload: string }
  | { type: AttachStorageActionType.SET_POOL_STATUS; payload: string }
  | { type: AttachStorageActionType.SET_POOL_REPLICA_SIZE; payload: string }
  | { type: AttachStorageActionType.SET_POOL_COMPRESSED; payload: boolean }
  | { type: AttachStorageActionType.SET_POOL_ARBITER; payload: boolean }
  | { type: AttachStorageActionType.SET_FAILURE_DOMAIN; payload: string }
  | { type: AttachStorageActionType.SET_INPROGRESS; payload: boolean }
  | { type: AttachStorageActionType.SET_ERROR_MESSAGE; payload: string }
  | { type: AttachStorageActionType.SET_LSO_STORAGECLASS; payload: string }
  | {
      type: AttachStorageActionType.SET_DEVICESET_ENCRYPTION;
      payload: boolean;
    }
  | {
      type: AttachStorageActionType.SET_POOL_TYPE;
      payload: PoolType;
    }
  | {
      type: AttachStorageActionType.SET_STORAGECLASS_NAME;
      payload: string;
    }
  | {
      type: AttachStorageActionType.SET_STORAGECLASS_ENCRYPTION;
      payload: boolean;
    }
  | {
      type: AttachStorageActionType.SET_ENCRYPTION_KMS_ID;
      payload: string;
    }
  | {
      type: AttachStorageActionType.SET_STORAGECLASS_RECLAIM_POLICY;
      payload: ReclaimPolicy;
    }
  | {
      type: AttachStorageActionType.SET_STORAGECLASS_VOLUME_BINDING_MODE;
      payload: VolumeBindingMode;
    }
  | {
      type: AttachStorageActionType.SET_DEVICE_CLASS;
      payload: string;
    };

export const attachStorageReducer = (
  state: AttachStorageFormState,
  action: AttachStorageAction
): AttachStorageFormState => {
  switch (action.type) {
    case AttachStorageActionType.SET_POOL_NAME: {
      return {
        ...state,
        poolName: action.payload,
      };
    }
    case AttachStorageActionType.SET_POOL_STATUS: {
      return {
        ...state,
        poolStatus: action.payload,
      };
    }
    case AttachStorageActionType.SET_POOL_REPLICA_SIZE: {
      return {
        ...state,
        replicaSize: action.payload,
      };
    }
    case AttachStorageActionType.SET_POOL_COMPRESSED: {
      return {
        ...state,
        isCompressed: action.payload,
      };
    }
    case AttachStorageActionType.SET_POOL_ARBITER: {
      return {
        ...state,
        isArbiterCluster: action.payload,
      };
    }
    case AttachStorageActionType.SET_FAILURE_DOMAIN: {
      return {
        ...state,
        failureDomain: action.payload,
      };
    }
    case AttachStorageActionType.SET_INPROGRESS: {
      return {
        ...state,
        inProgress: action.payload,
      };
    }
    case AttachStorageActionType.SET_ERROR_MESSAGE: {
      return {
        ...state,
        errorMessage: action.payload,
      };
    }
    case AttachStorageActionType.SET_LSO_STORAGECLASS: {
      return {
        ...state,
        lsoStorageClassName: action.payload,
      };
    }
    case AttachStorageActionType.SET_DEVICESET_ENCRYPTION: {
      return {
        ...state,
        enableEncryptionOnDeviceSet: action.payload,
      };
    }
    case AttachStorageActionType.SET_POOL_TYPE: {
      return {
        ...state,
        poolType: action.payload,
      };
    }
    case AttachStorageActionType.SET_STORAGECLASS_NAME: {
      return {
        ...state,
        storageClassDetails: {
          ...state.storageClassDetails,
          name: action.payload,
        },
      };
    }
    case AttachStorageActionType.SET_STORAGECLASS_ENCRYPTION: {
      return {
        ...state,
        storageClassDetails: {
          ...state.storageClassDetails,
          enableStorageClassEncryption: action.payload,
        },
      };
    }
    case AttachStorageActionType.SET_ENCRYPTION_KMS_ID: {
      return {
        ...state,
        storageClassDetails: {
          ...state.storageClassDetails,
          encryptionKMSID: action.payload,
        },
      };
    }
    case AttachStorageActionType.SET_STORAGECLASS_RECLAIM_POLICY: {
      return {
        ...state,
        storageClassDetails: {
          ...state.storageClassDetails,
          reclaimPolicy: action.payload,
        },
      };
    }
    case AttachStorageActionType.SET_STORAGECLASS_VOLUME_BINDING_MODE: {
      return {
        ...state,
        storageClassDetails: {
          ...state.storageClassDetails,
          volumeBindingMode: action.payload,
        },
      };
    }
    case AttachStorageActionType.SET_DEVICE_CLASS: {
      return {
        ...state,
        deviceClass: action.payload,
      };
    }
    default:
      return state;
  }
};
