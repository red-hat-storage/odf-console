import { MatchExpression } from '@openshift-console/dynamic-plugin-sdk';
import { AlertVariant } from '@patternfly/react-core';
import { DataPolicyType } from './types';

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

export enum ManagePolicyStateType {
  SET_MODAL_VIEW_CONTEXT = 'SET_MODAL_VIEW_CONTEXT',
  SET_MODAL_ACTION_CONTEXT = 'SET_MODAL_ACTION_CONTEXT',
  SET_SELECTED_POLICIES = 'SET_SELECTED_POLICIES',
  SET_SELECTED_POLICY = 'SET_SELECTED_POLICY',
  SET_MESSAGE = 'SET_MESSAGE',
  SET_PVC_SELECTORS = 'SET_PVC_SELECTORS',
  RESET_ASSIGN_POLICY_STATE = 'RESET_ASSIGN_POLICY_STATE',
  SET_POLICY_RULE = 'SET_POLICY_RULE',
  SET_APP_RESOURCE_SELECTOR = 'SET_APP_RESOURCE_SELECTOR',
  SET_RECIPE_INFO = 'SET_RECIPE_INFO',
  SET_CAPTURE_INTERVAL = 'SET_CAPTURE_INTERVAL',
  SET_OBJECT_PROTECTION_METHOD = 'SET_OBJECT_PROTECTION_METHOD',
}

export enum ObjectProtectionMethod {
  ResourceLabelSelector = 'ResourceLabelSelector',
  Recipe = 'Recipe',
}

export enum PolicyRule {
  Namespace = 'Namespace',
  Application = 'Application',
}

export type PVCSelectorType = {
  placementName: string;
  labels: string[];
};

export type RecipeInfoType = {
  name: string;
  namespace: string;
};

export type DynamicObjectType = {
  objectProtectionMethod: ObjectProtectionMethod;
  appResourceSelector?: MatchExpression[];
  recipeInfo: RecipeInfoType;
  captureInterval: string;
};

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
  persistentVolumeClaim: {
    pvcSelectors: PVCSelectorType[];
  };
  policyRule: PolicyRule;
  dynamicObjects: DynamicObjectType;
};

export type ManagePolicyState = {
  modalViewContext: ModalViewContext;
  [ModalViewContext.POLICY_LIST_VIEW]: PolicyListViewState;
  [ModalViewContext.POLICY_CONFIGURATON_VIEW]: PolicyConfigViewState;
  [ModalViewContext.ASSIGN_POLICY_VIEW]: AssignPolicyViewState;
};

const initialResourceSelector = [
  {
    key: '',
    operator: 'In',
    values: [],
  },
];

export const initialPolicyState: ManagePolicyState = {
  modalViewContext: ModalViewContext.POLICY_LIST_VIEW,
  [ModalViewContext.POLICY_LIST_VIEW]: {
    policies: [],
    modalActionContext: undefined,
    message: {
      title: '',
    },
  },
  [ModalViewContext.POLICY_CONFIGURATON_VIEW]: {
    policy: undefined,
  },
  [ModalViewContext.ASSIGN_POLICY_VIEW]: {
    policy: undefined,
    persistentVolumeClaim: {
      pvcSelectors: [],
    },
    policyRule: PolicyRule.Application,
    dynamicObjects: {
      objectProtectionMethod: ObjectProtectionMethod.ResourceLabelSelector,
      captureInterval: '5m',
      recipeInfo: undefined,
      appResourceSelector: initialResourceSelector,
    },
    modalActionContext: undefined,
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
      type: ManagePolicyStateType.SET_PVC_SELECTORS;
      context: ModalViewContext;
      payload: PVCSelectorType[];
    }
  | {
      type: ManagePolicyStateType.RESET_ASSIGN_POLICY_STATE;
      context: ModalViewContext;
    }
  | {
      type: ManagePolicyStateType.SET_POLICY_RULE;
      context: ModalViewContext;
      payload: PolicyRule;
    }
  | {
      type: ManagePolicyStateType.SET_APP_RESOURCE_SELECTOR;
      context: ModalViewContext;
      payload: MatchExpression[];
    }
  | {
      type: ManagePolicyStateType.SET_RECIPE_INFO;
      context: ModalViewContext;
      payload: RecipeInfoType;
    }
  | {
      type: ManagePolicyStateType.SET_CAPTURE_INTERVAL;
      context: ModalViewContext;
      payload: string;
    }
  | {
      type: ManagePolicyStateType.SET_OBJECT_PROTECTION_METHOD;
      context: ModalViewContext;
      payload: ObjectProtectionMethod;
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
    case ManagePolicyStateType.SET_POLICY_RULE: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          policyRule: action.payload,
        },
      };
    }
    case ManagePolicyStateType.SET_APP_RESOURCE_SELECTOR: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          dynamicObjects: {
            ...state[action.context]['dynamicObjects'],
            appResourceSelector: action.payload,
          },
        },
      };
    }
    case ManagePolicyStateType.SET_RECIPE_INFO: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          dynamicObjects: {
            ...state[action.context]['dynamicObjects'],
            recipeInfo: action.payload,
          },
        },
      };
    }
    case ManagePolicyStateType.SET_CAPTURE_INTERVAL: {
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          dynamicObjects: {
            ...state[action.context]['dynamicObjects'],
            captureInterval: action.payload,
          },
        },
      };
    }
    case ManagePolicyStateType.SET_OBJECT_PROTECTION_METHOD: {
      const objectProtectionMethod = action.payload;
      return {
        ...state,
        [action.context]: {
          ...state[action.context],
          dynamicObjects: {
            ...state[action.context]['dynamicObjects'],
            objectProtectionMethod: action.payload,
            ...(objectProtectionMethod === ObjectProtectionMethod.Recipe
              ? {
                  appResourceSelector: initialResourceSelector,
                }
              : { recipeInfo: undefined }),
          },
        },
      };
    }
    default:
      return state;
  }
};
