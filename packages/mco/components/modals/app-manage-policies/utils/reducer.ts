import { AlertVariant } from '@patternfly/react-core';
import { DRPolicyType } from './types';

export enum ModalViewContext {
  MANAGE_POLICY_VIEW = 'managePolicyView',
  ASSIGN_POLICY_VIEW = 'assignPolicyView',
}

export enum ModalActionContext {
  UN_ASSIGN_POLICY = 'UN_ASSIGN_POLICY',
  UN_ASSIGN_POLICY_SUCCEEDED = 'UN_ASSIGN_POLICY_SUCCEEDED',
  UN_ASSIGN_POLICY_FAILED = 'UN_ASSIGN_POLICY_FAILED',
  ASSIGN_POLICY_SUCCEEDED = 'ASSIGN_POLICY_SUCCEEDED',
  ASSIGN_POLICY_FAILED = 'ASSIGN_POLICY_FAILED',
  EDIT_DR_PROTECTION = 'EDIT_DR_PROTECTION',
}

export enum ManagePolicyStateType {
  SET_MODAL_VIEW_CONTEXT = 'SET_MODAL_VIEW_CONTEXT',
  SET_MODAL_ACTION_CONTEXT = 'SET_MODAL_ACTION_CONTEXT',
  SET_SELECTED_POLICY = 'SET_SELECTED_POLICY',
  SET_MESSAGE = 'SET_MESSAGE',
  SET_PVC_SELECTORS = 'SET_PVC_SELECTORS',
  RESET_ASSIGN_POLICY_STATE = 'RESET_ASSIGN_POLICY_STATE',
}

export type PVCSelectorType = {
  placementName: string;
  labels: string[];
};

export type MessageType = {
  title: string;
  description?: string;
  variant?: AlertVariant;
};

export type CommonViewState = {
  modalActionContext?: ModalActionContext;
  message?: MessageType;
};

export type ManagePolicyViewState = CommonViewState;

export type AssignPolicyViewState = CommonViewState & {
  policy: DRPolicyType;
  persistentVolumeClaim: {
    pvcSelectors: PVCSelectorType[];
  };
};

export type ManagePolicyState = {
  modalViewContext: ModalViewContext;
  [ModalViewContext.MANAGE_POLICY_VIEW]: ManagePolicyViewState;
  [ModalViewContext.ASSIGN_POLICY_VIEW]: AssignPolicyViewState;
};

export const initialPolicyState: ManagePolicyState = {
  modalViewContext: ModalViewContext.MANAGE_POLICY_VIEW,
  [ModalViewContext.MANAGE_POLICY_VIEW]: {},
  [ModalViewContext.ASSIGN_POLICY_VIEW]: {
    policy: undefined,
    persistentVolumeClaim: {
      pvcSelectors: [],
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
      type: ManagePolicyStateType.SET_SELECTED_POLICY;
      context: ModalViewContext;
      payload: DRPolicyType;
    }
  | {
      type: ManagePolicyStateType.SET_MESSAGE;
      context: ModalViewContext;
      payload: MessageType;
    }
  | {
      type: ManagePolicyStateType.SET_PVC_SELECTORS;
      context: ModalViewContext;
      payload: PVCSelectorType[];
    }
  | {
      type: ManagePolicyStateType.RESET_ASSIGN_POLICY_STATE;
      context: ModalViewContext;
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
    case ManagePolicyStateType.SET_PVC_SELECTORS: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          persistentVolumeClaim: {
            ...state[action.context]['persistentVolumeClaim'],
            pvcSelectors: action.payload,
          },
        },
      };
    }
    case ManagePolicyStateType.RESET_ASSIGN_POLICY_STATE: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          ...initialPolicyState[action.context],
        },
      };
    }
    default:
      return state;
  }
};
