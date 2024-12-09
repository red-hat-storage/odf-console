import { DRPolicyType } from './types';

export enum ModalViewContext {
  MANAGE_POLICY_VIEW = 'managePolicyView',
  ASSIGN_POLICY_VIEW = 'assignPolicyView',
}

export enum ModalActionContext {
  ENABLE_DR_PROTECTION = 'ENABLE_DR_PROTECTION',
  ENABLE_DR_PROTECTION_SUCCEEDED = 'ENABLE_DR_PROTECTION_SUCCEEDED',
  EDIT_DR_PROTECTION = 'EDIT_DR_PROTECTION',
  DISABLE_DR_PROTECTION = 'DISABLE_DR_PROTECTION',
  DISABLE_DR_PROTECTION_SUCCEEDED = 'DISABLE_DR_PROTECTION_SUCCEEDED',
  DISABLE_DR_PROTECTION_FAILED = 'DISABLE_DR_PROTECTION_FAILED',
}

export enum ManagePolicyStateType {
  SET_MODAL_VIEW_CONTEXT = 'SET_MODAL_VIEW_CONTEXT',
  SET_MODAL_ACTION_CONTEXT = 'SET_MODAL_ACTION_CONTEXT',
  SET_SELECTED_POLICY = 'SET_SELECTED_POLICY',
  SET_PVC_SELECTORS = 'SET_PVC_SELECTORS',
  RESET_ASSIGN_POLICY_STATE = 'RESET_ASSIGN_POLICY_STATE',
  ENABLE_CONSISTENCY_GROUP = 'ENABLE_CONSISTENCY_GROUP',
}

export type PVCSelectorType = {
  placementName: string;
  labels: string[];
};
export type AssignPolicyViewState = {
  policy: DRPolicyType;
  persistentVolumeClaim: {
    pvcSelectors: PVCSelectorType[];
    // Consistency group support for CephFS & RBD volumes
    isConsistencyGroupEnabled: boolean;
  };
};

export type ManagePolicyState = {
  modalViewContext: ModalViewContext;
  modalActionContext?: ModalActionContext;
  [ModalViewContext.ASSIGN_POLICY_VIEW]: AssignPolicyViewState;
};

export const initialPolicyState: ManagePolicyState = {
  modalViewContext: ModalViewContext.MANAGE_POLICY_VIEW,
  [ModalViewContext.ASSIGN_POLICY_VIEW]: {
    policy: undefined,
    persistentVolumeClaim: {
      pvcSelectors: [],
      isConsistencyGroupEnabled: false,
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
      payload: ModalActionContext;
    }
  | {
      type: ManagePolicyStateType.SET_SELECTED_POLICY;
      context: ModalViewContext;
      payload: DRPolicyType;
    }
  | {
      type: ManagePolicyStateType.SET_PVC_SELECTORS;
      context: ModalViewContext;
      payload: PVCSelectorType[];
    }
  | {
      type: ManagePolicyStateType.RESET_ASSIGN_POLICY_STATE;
      context: ModalViewContext;
    }
  | {
      type: ManagePolicyStateType.ENABLE_CONSISTENCY_GROUP;
      context: ModalViewContext;
      payload: boolean;
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
        modalActionContext: action.payload,
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
    case ManagePolicyStateType.ENABLE_CONSISTENCY_GROUP: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          persistentVolumeClaim: {
            ...state[action.context]['persistentVolumeClaim'],
            isConsistencyGroupEnabled: action.payload,
          },
        },
      };
    }
    default:
      return state;
  }
};
