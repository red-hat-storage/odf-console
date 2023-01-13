import { PlacementDecision } from '../../../types';
import { ApplicationDRInfo } from '../../../utils';
import { ErrorMessageType, MessageKind } from './error-messages';

export enum ACTION_TYPE {
  FAILOVER = 'Failover',
  RELOCATE = 'Relocate',
}

export enum ModalFooterStatus {
  INITIAL = 'intial',
  INPROGRESS = 'inProgress',
  FINISHED = 'finished',
  ERROR = 'error',
}

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
  drPolicyControlStateErrorMessage: ErrorMessageType;
  managedClustersErrorMessage: ErrorMessageType;
  targetClusterErrorMessage: ErrorMessageType;
  subscriptionGroupErrorMessage: ErrorMessageType;
  peerStatusErrorMessage: ErrorMessageType;
}>;

export type FailoverAndRelocateState = {
  actionType: ACTION_TYPE;
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
  actionType: ACTION_TYPE
): FailoverAndRelocateState => ({
  actionType,
  drPolicyControlState: [],
  selectedTargetCluster: {},
  selectedDRPolicy: {},
  modalFooterStatus: ModalFooterStatus.INITIAL,
  selectedSubsGroups: [],
  errorMessage: {
    drPolicyControlStateErrorMessage: null,
    managedClustersErrorMessage: null,
    targetClusterErrorMessage: null,
    subscriptionGroupErrorMessage: null,
    peerStatusErrorMessage: null,
  },
  actionErrorMessage: {},
});

export type FailoverAndRelocateAction =
  | {
      type: FailoverAndRelocateType.SET_ACTION_TYPE;
      payload: ACTION_TYPE;
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
