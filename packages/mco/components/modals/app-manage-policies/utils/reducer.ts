import { AlertVariant } from '@patternfly/react-core';
import { DataPolicyType } from './types';

export enum ModalViewContext {
  POLICY_LIST_VIEW = 'policyListView',
  ASSIGN_POLICY_VIEW = 'assignPolicyView',
  UNASSIGN_POLICY_VIEW = 'unAssignPolicyView',
  POLICY_CONFIGURATON_VIEW = 'policyConfigurationView',
}

export enum ModalActionContext {
  UN_ASSIGNING_POLICIES = 'UN_ASSIGNING_POLICIES',
  UN_ASSIGNING_POLICY = 'UN_ASSIGNING_POLICY',
  UN_ASSIGN_POLICIES_SUCCEEDED = 'UN_ASSIGN_POLICIES_SUCCEEDED',
  UN_ASSIGN_POLICY_SUCCEEDED = 'UN_ASSIGN_POLICY_SUCCEEDED',
  UN_ASSIGN_POLICIES_FAILED = 'UN_ASSIGN_POLICIES_FAILED',
  UN_ASSIGN_POLICY_FAILED = 'UN_ASSIGN_POLICY_FAILED',
}

export type MessageType = {
  title: string;
  description?: string;
  variant?: AlertVariant;
};

export type commonViewState = {
  modalActionContext: ModalActionContext;
  message: MessageType;
};

export type PolicyListViewState = commonViewState & {
  policies: DataPolicyType[];
};

export type PolicyConfigViewState = {
  policy: DataPolicyType;
};

export type UnAssignPolicyViewState = commonViewState & {
  policy: DataPolicyType;
};

export type ManagePolicyState = {
  modalViewContext: ModalViewContext;
  [ModalViewContext.POLICY_LIST_VIEW]: PolicyListViewState;
  [ModalViewContext.UNASSIGN_POLICY_VIEW]: UnAssignPolicyViewState;
  [ModalViewContext.POLICY_CONFIGURATON_VIEW]: PolicyConfigViewState;
};

export enum ManagePolicyStateType {
  SET_MODAL_VIEW_CONTEXT = 'SET_MODAL_VIEW_CONTEXT',
  SET_MODAL_ACTION_CONTEXT = 'SET_MODAL_ACTION_CONTEXT',
  SET_SELECTED_POLICIES = 'SET_SELECTED_POLICIES',
  SET_SELECTED_POLICY = 'SET_SELECTED_POLICY',
  SET_MESSAGE = 'SET_MESSAGE',
}

export const initialPolicyState: ManagePolicyState = {
  modalViewContext: ModalViewContext.POLICY_LIST_VIEW,
  [ModalViewContext.POLICY_LIST_VIEW]: {
    policies: [],
    modalActionContext: null,
    message: {
      title: '',
    },
  },
  [ModalViewContext.UNASSIGN_POLICY_VIEW]: {
    policy: {},
    modalActionContext: null,
    message: {
      title: '',
    },
  },
  [ModalViewContext.POLICY_CONFIGURATON_VIEW]: {
    policy: {},
  },
};

export type ManagePolicyStateAction =
  | {
      type: ManagePolicyStateType.SET_MODAL_VIEW_CONTEXT;
      payload: ModalViewContext;
    }
  | {
      type: ManagePolicyStateType.SET_MODAL_ACTION_CONTEXT;
      context: ModalViewContext;
      payload: ModalActionContext;
    }
  | {
      type: ManagePolicyStateType.SET_SELECTED_POLICIES;
      context: ModalViewContext;
      payload: DataPolicyType[];
    }
  | {
      type: ManagePolicyStateType.SET_SELECTED_POLICY;
      context: ModalViewContext;
      payload: DataPolicyType;
    }
  | {
      type: ManagePolicyStateType.SET_MESSAGE;
      context: ModalViewContext;
      payload: MessageType;
    };

export const managePolicyStateReducer = (
  state: ManagePolicyState,
  action: ManagePolicyStateAction
) => {
  switch (action.type) {
    case ManagePolicyStateType.SET_MODAL_VIEW_CONTEXT: {
      return {
        ...state,
        modalViewContext: action.payload,
      };
    }
    case ManagePolicyStateType.SET_MODAL_ACTION_CONTEXT: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          modalActionContext: action.payload,
        },
      };
    }
    case ManagePolicyStateType.SET_SELECTED_POLICIES: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          policies: action.payload,
        },
      };
    }
    case ManagePolicyStateType.SET_SELECTED_POLICY: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          policy: action.payload,
        },
      };
    }
    case ManagePolicyStateType.SET_MESSAGE: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          message: action.payload,
        },
      };
    }
    default:
      return state;
  }
};
