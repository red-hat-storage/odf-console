import { DRPolicyType, VMProtectionType } from './types';

export enum ModalViewContext {
  MANAGE_POLICY_VIEW = 'managePolicyView',
  ASSIGN_POLICY_VIEW = 'assignPolicyView',
  VOLUME_CONSISTENCY_GROUP_VIEW = 'volumeConsistencyGroupView',
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
  SET_VM_PROTECTION_METHOD = 'SET_VM_PROTECTION_METHOD',
  SET_VM_PROTECTION_NAME = 'SET_VM_PROTECTION_NAME',
  SET_SELECTED_POLICY_FOR_REPLICATION = 'SET_SELECTED_POLICY_FOR_REPLICATION',
  SET_K8S_SYNC_INTERVAL = 'SET_K8S_SYNC_INTERVAL',
  SET_SHARED_VM_GROUP_INFO = 'SET_SHARED_VM_GROUP_INFO',
  SET_VOLUME_CONSISTENCY_ENABLED = 'SET_VOLUME_CONSISTENCY_ENABLED',
}

export type PVCSelectorType = {
  placementName: string;
  labels: string[];
};

export type AssignPolicyViewState = {
  policy: DRPolicyType;
  enableVolumeConsistencyGroup: boolean;
  persistentVolumeClaim: {
    pvcSelectors: PVCSelectorType[];
  };
  protectionType?: {
    protectionType: VMProtectionType;
    protectionName: string;
    protectedVMNames: string[];
  };
  replication?: {
    policy: DRPolicyType;
    k8sSyncInterval: string;
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
    enableVolumeConsistencyGroup: false,
    policy: undefined,
    persistentVolumeClaim: {
      pvcSelectors: [],
    },
    protectionType: {
      protectionType: VMProtectionType.STANDALONE,
      protectionName: '',
      protectedVMNames: [],
    },
    replication: {
      policy: undefined,
      k8sSyncInterval: '5m',
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
      type: ManagePolicyStateType.SET_VOLUME_CONSISTENCY_ENABLED;
      payload: boolean;
    }
  | {
      type: ManagePolicyStateType.RESET_ASSIGN_POLICY_STATE;
      context: ModalViewContext;
    }
  | {
      type: ManagePolicyStateType.SET_VM_PROTECTION_METHOD;
      context: ModalViewContext;
      payload: VMProtectionType;
    }
  | {
      type: ManagePolicyStateType.SET_VM_PROTECTION_NAME;
      context: ModalViewContext;
      payload: string;
    }
  | {
      type: ManagePolicyStateType.SET_SELECTED_POLICY_FOR_REPLICATION;
      context: ModalViewContext;
      payload: DRPolicyType;
    }
  | {
      type: ManagePolicyStateType.SET_K8S_SYNC_INTERVAL;
      context: ModalViewContext;
      payload: string;
    }
  | {
      type: ManagePolicyStateType.SET_SHARED_VM_GROUP_INFO;
      context: ModalViewContext;
      payload: {
        protectionName: string;
        policy: DRPolicyType;
        k8sSyncInterval: string;
        sharedVMGroup: string[];
      };
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
    case ManagePolicyStateType.SET_VM_PROTECTION_METHOD: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          protectionType: {
            ...initialPolicyState[action.context]['protectionType'],
            protectionType: action.payload,
          },
          replication: initialPolicyState[action.context]['replication'],
        },
      };
    }
    case ManagePolicyStateType.SET_VM_PROTECTION_NAME: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          protectionType: {
            ...state[action.context]['protectionType'],
            protectionName: action.payload,
          },
        },
      };
    }
    case ManagePolicyStateType.SET_SELECTED_POLICY_FOR_REPLICATION: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          replication: {
            ...state[action.context]['replication'],
            policy: action.payload,
          },
        },
      };
    }
    case ManagePolicyStateType.SET_K8S_SYNC_INTERVAL: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          replication: {
            ...state[action.context]['replication'],
            k8sSyncInterval: action.payload,
          },
        },
      };
    }
    case ManagePolicyStateType.SET_SHARED_VM_GROUP_INFO: {
      const { policy, k8sSyncInterval, protectionName, sharedVMGroup } =
        action.payload;
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          replication: {
            ...state[action.context]['replication'],
            policy: policy,
            k8sSyncInterval: k8sSyncInterval,
          },
          protectionType: {
            ...state[action.context]['protectionType'],
            protectionName: protectionName,
            protectedVMNames: sharedVMGroup,
          },
        },
      };
    }
    case ManagePolicyStateType.SET_VOLUME_CONSISTENCY_ENABLED: {
      return {
        ...state,
        [ModalViewContext.ASSIGN_POLICY_VIEW]: {
          ...state[ModalViewContext.ASSIGN_POLICY_VIEW],
          enableVolumeConsistencyGroup: action.payload,
        },
      };
    }
    default:
      return state;
  }
};
