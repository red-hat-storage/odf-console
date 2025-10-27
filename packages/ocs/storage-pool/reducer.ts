export type StoragePoolState = {
  poolName: string;
  poolStatus: string;
  replicaSize: string;
  isCompressed: boolean;
  isArbiterCluster: boolean;
  failureDomain: string;
  inProgress: boolean;
  errorMessage: string;
  useExistingOsds: boolean;
};

export enum StoragePoolActionType {
  SET_POOL_NAME = 'SET_POOL_NAME',
  SET_POOL_STATUS = 'SET_POOL_STATUS',
  SET_POOL_REPLICA_SIZE = 'SET_POOL_REPLICA_SIZE',
  SET_POOL_COMPRESSED = 'SET_POOL_COMPRESSED',
  SET_POOL_ARBITER = 'SET_POOL_ARBITER',
  SET_FAILURE_DOMAIN = 'SET_FAILURE_DOMAIN',
  SET_INPROGRESS = 'SET_INPROGRESS',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
  SET_USE_EXISTING_OSDS = 'SET_USE_EXISTING_OSDS',
}

export const blockPoolInitialState: StoragePoolState = {
  poolName: '',
  poolStatus: '',
  replicaSize: '',
  isCompressed: false,
  isArbiterCluster: false,
  failureDomain: '',
  inProgress: false,
  errorMessage: '',
  useExistingOsds: false,
};

export type StoragePoolAction =
  | { type: StoragePoolActionType.SET_POOL_NAME; payload: string }
  | { type: StoragePoolActionType.SET_POOL_STATUS; payload: string }
  | { type: StoragePoolActionType.SET_POOL_REPLICA_SIZE; payload: string }
  | { type: StoragePoolActionType.SET_POOL_COMPRESSED; payload: boolean }
  | { type: StoragePoolActionType.SET_POOL_ARBITER; payload: boolean }
  | { type: StoragePoolActionType.SET_FAILURE_DOMAIN; payload: string }
  | { type: StoragePoolActionType.SET_INPROGRESS; payload: boolean }
  | { type: StoragePoolActionType.SET_ERROR_MESSAGE; payload: string }
  | { type: StoragePoolActionType.SET_USE_EXISTING_OSDS; payload: boolean };

export const storagePoolReducer = (
  state: StoragePoolState,
  action: StoragePoolAction
) => {
  switch (action.type) {
    case StoragePoolActionType.SET_POOL_NAME: {
      return {
        ...state,
        poolName: action.payload,
      };
    }
    case StoragePoolActionType.SET_POOL_STATUS: {
      return {
        ...state,
        poolStatus: action.payload,
      };
    }
    case StoragePoolActionType.SET_POOL_REPLICA_SIZE: {
      return {
        ...state,
        replicaSize: action.payload,
      };
    }
    case StoragePoolActionType.SET_POOL_COMPRESSED: {
      return {
        ...state,
        isCompressed: action.payload,
      };
    }
    case StoragePoolActionType.SET_POOL_ARBITER: {
      return {
        ...state,
        isArbiterCluster: action.payload,
      };
    }
    case StoragePoolActionType.SET_FAILURE_DOMAIN: {
      return {
        ...state,
        failureDomain: action.payload,
      };
    }
    case StoragePoolActionType.SET_INPROGRESS: {
      return {
        ...state,
        inProgress: action.payload,
      };
    }
    case StoragePoolActionType.SET_ERROR_MESSAGE: {
      return {
        ...state,
        errorMessage: action.payload,
      };
    }
    case StoragePoolActionType.SET_USE_EXISTING_OSDS: {
      return {
        ...state,
        useExistingOsds: action.payload,
      };
    }
    default:
      return state;
  }
};
