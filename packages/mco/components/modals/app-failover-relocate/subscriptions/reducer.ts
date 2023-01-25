import { DRActionType } from '../../../../constants';
import { ApplicationDRInfo } from '../../../../utils';
import { MessageKind } from './error-messages';

export enum ModalFooterStatus {
  INITIAL = 'intial',
  INPROGRESS = 'inProgress',
  FINISHED = 'finished',
  ERROR = 'error',
}

export type PlacementDecision = {
  clusterName?: string;
  clusterNamespace?: string;
};

export type DRPolicyControlState = ApplicationDRInfo;

export type DRPolicyType = Partial<{
  policyName: string;
  drClusters: string[];
}>;

export type TargetClusterType = Partial<{
  clusterInfo: PlacementDecision;
  isClusterAvailable: boolean;
  lastAvailableTime: string;
}>;

export type ErrorMessage = Partial<{
  drPolicyControlStateErrorMessage: number;
  managedClustersErrorMessage: number;
  targetClusterErrorMessage: number;
  subscriptionGroupErrorMessage: number;
  peerStatusErrorMessage: number;
}>;

export type FailoverAndRelocateState = {
  actionType: DRActionType;
  drPolicyControlState: DRPolicyControlState[];
  selectedDRPolicy: DRPolicyType;
  selectedTargetCluster: TargetClusterType;
  modalFooterStatus: ModalFooterStatus;
  selectedSubsGroups: string[];
  errorMessage: ErrorMessage;
  actionErrorMessage: MessageKind;
};

export enum FailoverAndRelocateType {
  SET_ACTION_TYPE = 'SET_ACTION_TYPE',
  SET_DR_POLICY_CONTROL_STATE = 'SET_DR_POLICY_CONTROL_STATE',
  SET_SELECTED_DR_POLICY = 'SET_SELECTED_DR_POLICY',
  SET_SELECTED_TARGET_CLUSTER = 'SET_SELECTED_TARGET_CLUSTER',
  SET_MODAL_FOOTER_STATUS = 'SET_MODAL_FOOTER_STATUS',
  SET_SELECTED_SUBS_GROUP = 'SET_SELECTED_SUBS_GROUP',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
  SET_ACTION_ERROR_MESSAGE = 'SET_ACTION_ERROR_MESSAGE',
}

export const failoverAndRelocateState = (
  actionType: DRActionType
): FailoverAndRelocateState => ({
  actionType,
  drPolicyControlState: [],
  selectedTargetCluster: {},
  selectedDRPolicy: {},
  modalFooterStatus: ModalFooterStatus.INITIAL,
  selectedSubsGroups: [],
  errorMessage: {
    drPolicyControlStateErrorMessage: 0,
    managedClustersErrorMessage: 0,
    targetClusterErrorMessage: 0,
    subscriptionGroupErrorMessage: 0,
    peerStatusErrorMessage: 0,
  },
  actionErrorMessage: {},
});

export type FailoverAndRelocateAction =
  | {
      type: FailoverAndRelocateType.SET_ACTION_TYPE;
      payload: DRActionType;
    }
  | {
      type: FailoverAndRelocateType.SET_DR_POLICY_CONTROL_STATE;
      payload: DRPolicyControlState[];
    }
  | {
      type: FailoverAndRelocateType.SET_SELECTED_DR_POLICY;
      payload: DRPolicyType;
    }
  | {
      type: FailoverAndRelocateType.SET_SELECTED_TARGET_CLUSTER;
      payload: TargetClusterType;
    }
  | {
      type: FailoverAndRelocateType.SET_MODAL_FOOTER_STATUS;
      payload: ModalFooterStatus;
    }
  | {
      type: FailoverAndRelocateType.SET_SELECTED_SUBS_GROUP;
      payload: {
        selected: string[];
        isUpdate: boolean;
      };
    }
  | { type: FailoverAndRelocateType.SET_ERROR_MESSAGE; payload: ErrorMessage }
  | {
      type: FailoverAndRelocateType.SET_ACTION_ERROR_MESSAGE;
      payload: MessageKind;
    };

export const failoverAndRelocateReducer = (
  state: FailoverAndRelocateState,
  action: FailoverAndRelocateAction
) => {
  switch (action.type) {
    case FailoverAndRelocateType.SET_ACTION_TYPE: {
      return {
        ...state,
        actionType: action.payload,
      };
    }
    case FailoverAndRelocateType.SET_DR_POLICY_CONTROL_STATE: {
      return {
        ...state,
        drPolicyControlState: action.payload,
      };
    }
    case FailoverAndRelocateType.SET_SELECTED_DR_POLICY: {
      return {
        ...state,
        selectedDRPolicy: action.payload,
      };
    }
    case FailoverAndRelocateType.SET_SELECTED_TARGET_CLUSTER: {
      return {
        ...state,
        selectedTargetCluster: action.payload,
      };
    }
    case FailoverAndRelocateType.SET_MODAL_FOOTER_STATUS: {
      return {
        ...state,
        modalFooterStatus: action.payload,
      };
    }
    case FailoverAndRelocateType.SET_SELECTED_SUBS_GROUP: {
      return {
        ...state,
        selectedSubsGroups: action.payload.isUpdate
          ? [
              ...new Set([
                ...state.selectedSubsGroups,
                ...action.payload.selected,
              ]),
            ]
          : action.payload.selected,
      };
    }
    case FailoverAndRelocateType.SET_ERROR_MESSAGE: {
      const keys: string[] = Object.keys(action.payload);
      return {
        ...state,
        errorMessage: Object.keys(state.errorMessage).reduce(
          (arr, key) => ({
            ...arr,
            [key]: keys.includes(key)
              ? action.payload[key]
              : state.errorMessage[key],
          }),
          {}
        ),
      };
    }
    case FailoverAndRelocateType.SET_ACTION_ERROR_MESSAGE: {
      const { title, variant, message } = action.payload || {};
      return {
        ...state,
        actionErrorMessage: {
          title,
          variant,
          message,
        },
      };
    }
    default:
      return state;
  }
};
