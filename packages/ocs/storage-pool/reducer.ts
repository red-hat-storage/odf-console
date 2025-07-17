export type StoragePoolState = {
  poolName: string;
  poolStatus: string;
  replicaSize: string;
  isCompressed: boolean;
  isArbiterCluster: boolean;
  isTwoNodeOneArbiterCluster: boolean;
  failureDomain: string;
  inProgress: boolean;
  errorMessage: string;
};

export enum StoragePoolActionType {
  SET_POOL_NAME = 'SET_POOL_NAME',
  SET_POOL_STATUS = 'SET_POOL_STATUS',
  SET_POOL_REPLICA_SIZE = 'SET_POOL_REPLICA_SIZE',
  SET_POOL_COMPRESSED = 'SET_POOL_COMPRESSED',
  SET_POOL_ARBITER = 'SET_POOL_ARBITER',
  SET_POOL_TWO_NODE_ONE_ARBITER = 'SET_POOL_TWO_NODE_ONE_ARBITER',
  SET_FAILURE_DOMAIN = 'SET_FAILURE_DOMAIN',
  SET_INPROGRESS = 'SET_INPROGRESS',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
}

export const blockPoolInitialState: StoragePoolState = {
  poolName: '',
  poolStatus: '',
  replicaSize: '',
  isCompressed: false,
  isArbiterCluster: false,
  isTwoNodeOneArbiterCluster: false,
  failureDomain: '',
  inProgress: false,
  errorMessage: '',
};

export type StoragePoolAction =
  | { type: StoragePoolActionType.SET_POOL_NAME; payload: string }
  | { type: StoragePoolActionType.SET_POOL_STATUS; payload: string }
  | { type: StoragePoolActionType.SET_POOL_REPLICA_SIZE; payload: string }
  | { type: StoragePoolActionType.SET_POOL_COMPRESSED; payload: boolean }
  | { type: StoragePoolActionType.SET_POOL_ARBITER; payload: boolean }
  | {
      type: StoragePoolActionType.SET_POOL_TWO_NODE_ONE_ARBITER;
      payload: boolean;
    }
  | { type: StoragePoolActionType.SET_FAILURE_DOMAIN; payload: string }
  | { type: StoragePoolActionType.SET_INPROGRESS; payload: boolean }
  | { type: StoragePoolActionType.SET_ERROR_MESSAGE; payload: string };

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
    case StoragePoolActionType.SET_POOL_TWO_NODE_ONE_ARBITER: {
      return {
        ...state,
        isTwoNodeOneArbiterCluster: action.payload,
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
    default:
      return state;
  }
};
