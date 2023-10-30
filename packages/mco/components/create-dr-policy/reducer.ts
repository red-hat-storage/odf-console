export type ODFInfo = Partial<{
  storageClusterName: string;
  storageSystemName: string;
  cephFSID: string;
  odfVersion: string;
  isValidODFVersion: boolean;
  isManagedClusterAvailable: boolean;
}>;

export type Cluster = {
  name: string;
  region: string;
} & ODFInfo;

export type DRPolicyState = {
  policyName: string;
  replication: string;
  syncTime: string;
  selectedClusters: Cluster[];
  isODFDetected: boolean;
  isReplicationInputManual: boolean;
  errorMessage: string;
};

export enum DRPolicyActionType {
  SET_POLICY_NAME = 'SET_POLICY_NAME',
  SET_REPLICATION = 'SET_REPLICATION',
  SET_SYNC_TIME = 'SET_SYNC_TIME',
  SET_SELECTED_CLUSTERS = 'SET_SELECTED_CLUSTERS',
  UPDATE_SELECTED_CLUSTERS = 'UPDATE_SELECTED_CLUSTERS',
  SET_IS_ODF_DETECTED = 'SET_IS_ODF_DETECTED',
  SET_IS_REPLICATION_INPUT_MANUAL = 'SET_IS_REPLICATION_INPUT_MANUAL',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
}

export const drPolicyInitialState: DRPolicyState = {
  policyName: '',
  replication: '',
  syncTime: '5m',
  selectedClusters: [],
  isODFDetected: false,
  isReplicationInputManual: false,
  errorMessage: '',
};

export type DRPolicyAction =
  | { type: DRPolicyActionType.SET_POLICY_NAME; payload: string }
  | { type: DRPolicyActionType.SET_REPLICATION; payload: string }
  | { type: DRPolicyActionType.SET_SYNC_TIME; payload: string }
  | {
      type: DRPolicyActionType.SET_SELECTED_CLUSTERS;
      payload: Cluster[];
    }
  | { type: DRPolicyActionType.SET_IS_ODF_DETECTED; payload: boolean }
  | {
      type: DRPolicyActionType.SET_IS_REPLICATION_INPUT_MANUAL;
      payload: boolean;
    }
  | { type: DRPolicyActionType.SET_ERROR_MESSAGE; payload: string };

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
    case DRPolicyActionType.SET_REPLICATION: {
      return {
        ...state,
        replication: action.payload,
      };
    }
    case DRPolicyActionType.SET_SYNC_TIME: {
      return {
        ...state,
        syncTime: action.payload,
      };
    }
    case DRPolicyActionType.SET_SELECTED_CLUSTERS: {
      return {
        ...state,
        selectedClusters: action.payload,
      };
    }
    case DRPolicyActionType.SET_IS_ODF_DETECTED: {
      return {
        ...state,
        isODFDetected: action.payload,
      };
    }
    case DRPolicyActionType.SET_IS_REPLICATION_INPUT_MANUAL: {
      return {
        ...state,
        isReplicationInputManual: action.payload,
      };
    }
    case DRPolicyActionType.SET_ERROR_MESSAGE: {
      return {
        ...state,
        errorMessage: action.payload,
      };
    }
    default:
      return state;
  }
};
