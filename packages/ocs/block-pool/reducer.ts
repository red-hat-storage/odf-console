export type BlockPoolState = {
  poolName: string;
  poolStatus: string;
  replicaSize: string;
  isCompressed: boolean;
  isArbiterCluster: boolean;
  failureDomain: string;
  inProgress: boolean;
  errorMessage: string;
};

export enum BlockPoolActionType {
  SET_POOL_NAME = 'SET_POOL_NAME',
  SET_POOL_STATUS = 'SET_POOL_STATUS',
  SET_POOL_REPLICA_SIZE = 'SET_POOL_REPLICA_SIZE',
  SET_POOL_COMPRESSED = 'SET_POOL_COMPRESSED',
  SET_POOL_ARBITER = 'SET_POOL_ARBITER',
  SET_FAILURE_DOMAIN = 'SET_FAILURE_DOMAIN',
  SET_INPROGRESS = 'SET_INPROGRESS',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
}

export const blockPoolInitialState: BlockPoolState = {
  poolName: '',
  poolStatus: '',
  replicaSize: '',
  isCompressed: false,
  isArbiterCluster: false,
  failureDomain: '',
  inProgress: false,
  errorMessage: '',
};

export type BlockPoolAction =
  | { type: BlockPoolActionType.SET_POOL_NAME; payload: string }
  | { type: BlockPoolActionType.SET_POOL_STATUS; payload: string }
  | { type: BlockPoolActionType.SET_POOL_REPLICA_SIZE; payload: string }
  | { type: BlockPoolActionType.SET_POOL_COMPRESSED; payload: boolean }
  | { type: BlockPoolActionType.SET_POOL_ARBITER; payload: boolean }
  | { type: BlockPoolActionType.SET_FAILURE_DOMAIN; payload: string }
  | { type: BlockPoolActionType.SET_INPROGRESS; payload: boolean }
  | { type: BlockPoolActionType.SET_ERROR_MESSAGE; payload: string };

export const blockPoolReducer = (
  state: BlockPoolState,
  action: BlockPoolAction
) => {
  switch (action.type) {
    case BlockPoolActionType.SET_POOL_NAME: {
      return {
        ...state,
        poolName: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_STATUS: {
      return {
        ...state,
        poolStatus: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_REPLICA_SIZE: {
      return {
        ...state,
        replicaSize: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_COMPRESSED: {
      return {
        ...state,
        isCompressed: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_ARBITER: {
      return {
        ...state,
        isArbiterCluster: action.payload,
      };
    }
    case BlockPoolActionType.SET_FAILURE_DOMAIN: {
      return {
        ...state,
        failureDomain: action.payload,
      };
    }
    case BlockPoolActionType.SET_INPROGRESS: {
      return {
        ...state,
        inProgress: action.payload,
      };
    }
    case BlockPoolActionType.SET_ERROR_MESSAGE: {
      return {
        ...state,
        errorMessage: action.payload,
      };
    }
    default:
      return state;
  }
};
