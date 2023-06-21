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
}

export type commonViewState = {
  modalActionContext: ModalActionContext;
  error: string;
};

export type PolicyListViewState = commonViewState & {
  policies: DataPolicyType[];
};

export type PolicyConfigViewState = {
  policy: DataPolicyType;
};

export type UnAssignPolicyViewState = commonViewState & {
  policy: DataPolicyType;
  modalActionContext: ModalActionContext;
  error: string;
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
  SET_ERROR = 'SET_ERROR',
}

export const initialPolicyState: ManagePolicyState = {
  modalViewContext: ModalViewContext.POLICY_LIST_VIEW,
  [ModalViewContext.POLICY_LIST_VIEW]: {
    policies: [],
    modalActionContext: null,
    error: '',
  },
  [ModalViewContext.UNASSIGN_POLICY_VIEW]: {
    policy: {},
    modalActionContext: null,
    error: '',
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
      type: ManagePolicyStateType.SET_ERROR;
      context: ModalViewContext;
      payload: string;
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
    case ManagePolicyStateType.SET_ERROR: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          error: action.payload,
        },
      };
    }
    default:
      return state;
  }
};
