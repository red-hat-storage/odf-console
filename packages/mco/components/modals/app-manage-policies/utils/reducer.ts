import { AlertVariant } from '@patternfly/react-core';
import { DRPlacementControlType, DataPolicyType } from './types';

export enum ModalViewContext {
  POLICY_LIST_VIEW = 'policyListView',
  ASSIGN_POLICY_VIEW = 'assignPolicyView',
  POLICY_CONFIGURATON_VIEW = 'policyConfigurationView',
}

export enum ModalActionContext {
  UN_ASSIGNING_POLICIES = 'UN_ASSIGNING_POLICIES',
  UN_ASSIGN_POLICIES_SUCCEEDED = 'UN_ASSIGN_POLICIES_SUCCEEDED',
  UN_ASSIGN_POLICIES_FAILED = 'UN_ASSIGN_POLICIES_FAILED',
  ASSIGN_POLICY_SUCCEEDED = 'ASSIGN_POLICY_SUCCEEDED',
  ASSIGN_POLICY_FAILED = 'ASSIGN_POLICY_FAILED',
}

export type MessageType = {
  title: string;
  description?: string;
  variant?: AlertVariant;
};

export type CommonViewState = {
  modalActionContext: ModalActionContext;
  message: MessageType;
};

export type PolicyListViewState = CommonViewState & {
  policies: DataPolicyType[];
};

export type PolicyConfigViewState = {
  policy: DataPolicyType;
};

export type AssignPolicyViewState = CommonViewState & {
  policy: DataPolicyType;
};

export type ManagePolicyState = {
  modalViewContext: ModalViewContext;
  [ModalViewContext.POLICY_LIST_VIEW]: PolicyListViewState;
  [ModalViewContext.POLICY_CONFIGURATON_VIEW]: PolicyConfigViewState;
  [ModalViewContext.ASSIGN_POLICY_VIEW]: AssignPolicyViewState;
};

export enum ManagePolicyStateType {
  SET_MODAL_VIEW_CONTEXT = 'SET_MODAL_VIEW_CONTEXT',
  SET_MODAL_ACTION_CONTEXT = 'SET_MODAL_ACTION_CONTEXT',
  SET_SELECTED_POLICIES = 'SET_SELECTED_POLICIES',
  SET_SELECTED_POLICY = 'SET_SELECTED_POLICY',
  SET_MESSAGE = 'SET_MESSAGE',
  SET_PLACEMENT_CONTROLS = 'SET_PLACEMENT_CONTROLS',
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
  [ModalViewContext.POLICY_CONFIGURATON_VIEW]: {
    policy: null,
  },
  [ModalViewContext.ASSIGN_POLICY_VIEW]: {
    policy: null,
    modalActionContext: null,
    message: {
      title: '',
    },
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
    }
  | {
      type: ManagePolicyStateType.SET_PLACEMENT_CONTROLS;
      context: ModalViewContext;
      payload: DRPlacementControlType[];
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
    case ManagePolicyStateType.SET_PLACEMENT_CONTROLS: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          policy: {
            ...state[action.context]['policy'],
            placementControlInfo: action.payload,
          },
        },
      };
    }
    default:
      return state;
  }
};
