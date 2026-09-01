import { Tag } from '@aws-sdk/client-s3';
import { StorageSizeUnitName } from '@odf/shared/types';
import * as _ from 'lodash-es';

export enum RuleScope {
  TARGETED = 'TARGETED',
  GLOBAL = 'GLOBAL',
}
// SizeUnit is a subset of StorageSizeUnitName.
export enum SizeUnit {
  B = StorageSizeUnitName.B,
  KiB = StorageSizeUnitName.KiB,
  MiB = StorageSizeUnitName.MiB,
  GiB = StorageSizeUnitName.GiB,
}
export enum FuncType {
  ON_PLUS = 'PLUS',
  ON_MINUS = 'MINUS',
  ON_CHANGE = 'CHANGE',
}
export enum LifecycleRuleStep {
  GENERAL = 'GENERAL',
  FILTERS = 'FILTERS',
  ACTIONS = 'ACTIONS',
  REVIEW = 'REVIEW',
}

export type StateAndDispatchProps = {
  state: RuleState;
  dispatch: React.Dispatch<RuleAction>;
};
export type ObjectSize = {
  isChecked: boolean;
  size: number;
  unit: SizeUnit;
  sizeInB: number;
};
type DeleteObject = { isChecked: boolean; days: number };
type DeleteNonCurrent = DeleteObject & { retention: number };
type TransitionObject = { isChecked: boolean; days: number };
type TransitionNonCurrent = TransitionObject & { retention: number };

// Step 1: General Configuration
type GeneralConfig = {
  name: string;
  scope: RuleScope;
};

// Step 2: Conditional Filters
type ConditionalFilters = {
  prefix: string;
  objectTags: Tag[];
  maxObjectSize: ObjectSize;
  minObjectSize: ObjectSize;
};

// Step 3: Lifecycle Rule Actions
type RuleActions = {
  deleteCurrent: DeleteObject;
  deleteNonCurrent: DeleteNonCurrent;
  deleteIncompleteMultiparts: DeleteObject;
  deleteExpiredMarkers: boolean;
  transitionCurrent: TransitionObject;
  transitionNonCurrent: TransitionNonCurrent;
};

export type RuleState = {
  // Step 1: General Configuration
  generalConfig: GeneralConfig;
  // Step 2: Conditional Filters
  conditionalFilters: ConditionalFilters;
  // Step 3: Lifecycle Rule Actions
  ruleActions: RuleActions;
};

export const ruleInitialState: RuleState = {
  generalConfig: {
    name: '',
    scope: RuleScope.TARGETED,
  },
  conditionalFilters: {
    prefix: '',
    objectTags: [],
    maxObjectSize: {
      isChecked: false,
      size: 1,
      unit: SizeUnit.KiB,
      sizeInB: 1024,
    },
    minObjectSize: {
      isChecked: false,
      size: 0,
      unit: SizeUnit.KiB,
      sizeInB: 0,
    },
  },
  ruleActions: {
    deleteCurrent: {
      isChecked: false,
      days: 1,
    },
    deleteNonCurrent: {
      isChecked: false,
      days: 1,
      retention: 0,
    },
    deleteIncompleteMultiparts: {
      isChecked: false,
      days: 1,
    },
    deleteExpiredMarkers: false,
    transitionCurrent: {
      isChecked: false,
      days: 1,
    },
    transitionNonCurrent: {
      isChecked: false,
      days: 1,
      retention: 0,
    },
  },
};

export enum RuleActionType {
  RULE = 'RULE',
  // General Config actions
  GENERAL_CONFIG_NAME = 'generalConfig/setName',
  GENERAL_CONFIG_SCOPE = 'generalConfig/setScope',
  // Conditional Filters actions
  CONDITIONAL_FILTERS_PREFIX = 'conditionalFilters/setPrefix',
  CONDITIONAL_FILTERS_TAGS = 'conditionalFilters/setTags',
  CONDITIONAL_FILTERS_MIN_SIZE = 'conditionalFilters/setMinSize',
  CONDITIONAL_FILTERS_MAX_SIZE = 'conditionalFilters/setMaxSize',
  // Rule Actions actions
  RULE_ACTIONS_DELETE_CURRENT = 'ruleActions/setDeleteCurrent',
  RULE_ACTIONS_DELETE_NON_CURRENT = 'ruleActions/setDeleteNonCurrent',
  RULE_ACTIONS_DELETE_MULTIPARTS = 'ruleActions/setDeleteMultiparts',
  RULE_ACTIONS_DELETE_MARKERS = 'ruleActions/setDeleteMarkers',
  RULE_ACTIONS_TRANSITION_CURRENT = 'ruleActions/setTransitionCurrent',
  RULE_ACTIONS_TRANSITION_NON_CURRENT = 'ruleActions/setTransitionNonCurrent',
}

export type RuleAction =
  | { type: RuleActionType.RULE; payload: RuleState }
  // General Config
  | { type: RuleActionType.GENERAL_CONFIG_NAME; payload: string }
  | { type: RuleActionType.GENERAL_CONFIG_SCOPE; payload: RuleScope }
  // Conditional Filters
  | { type: RuleActionType.CONDITIONAL_FILTERS_PREFIX; payload: string }
  | { type: RuleActionType.CONDITIONAL_FILTERS_TAGS; payload: Tag[] }
  | { type: RuleActionType.CONDITIONAL_FILTERS_MIN_SIZE; payload: ObjectSize }
  | { type: RuleActionType.CONDITIONAL_FILTERS_MAX_SIZE; payload: ObjectSize }
  // Rule Actions
  | {
      type: RuleActionType.RULE_ACTIONS_DELETE_CURRENT;
      payload: DeleteObject;
    }
  | {
      type: RuleActionType.RULE_ACTIONS_DELETE_NON_CURRENT;
      payload: DeleteNonCurrent;
    }
  | {
      type: RuleActionType.RULE_ACTIONS_DELETE_MULTIPARTS;
      payload: DeleteObject;
    }
  | { type: RuleActionType.RULE_ACTIONS_DELETE_MARKERS; payload: boolean }
  | {
      type: RuleActionType.RULE_ACTIONS_TRANSITION_CURRENT;
      payload: TransitionObject;
    }
  | {
      type: RuleActionType.RULE_ACTIONS_TRANSITION_NON_CURRENT;
      payload: TransitionNonCurrent;
    };

export const ruleReducer = (
  state: RuleState,
  action: RuleAction
): RuleState => {
  let newState: RuleState = _.cloneDeep(state);
  switch (action.type) {
    case RuleActionType.RULE: {
      newState = action.payload;
      break;
    }
    // General Config
    case RuleActionType.GENERAL_CONFIG_NAME: {
      newState.generalConfig.name = action.payload;
      break;
    }
    case RuleActionType.GENERAL_CONFIG_SCOPE: {
      newState.generalConfig.scope = action.payload;
      break;
    }
    // Conditional Filters
    case RuleActionType.CONDITIONAL_FILTERS_PREFIX: {
      newState.conditionalFilters.prefix = action.payload;
      break;
    }
    case RuleActionType.CONDITIONAL_FILTERS_TAGS: {
      newState.conditionalFilters.objectTags = action.payload;
      break;
    }
    case RuleActionType.CONDITIONAL_FILTERS_MIN_SIZE: {
      newState.conditionalFilters.minObjectSize = action.payload;
      break;
    }
    case RuleActionType.CONDITIONAL_FILTERS_MAX_SIZE: {
      newState.conditionalFilters.maxObjectSize = action.payload;
      break;
    }
    // Rule Actions
    case RuleActionType.RULE_ACTIONS_DELETE_CURRENT: {
      newState.ruleActions.deleteCurrent = action.payload;
      break;
    }
    case RuleActionType.RULE_ACTIONS_DELETE_NON_CURRENT: {
      newState.ruleActions.deleteNonCurrent = action.payload;
      break;
    }
    case RuleActionType.RULE_ACTIONS_DELETE_MULTIPARTS: {
      newState.ruleActions.deleteIncompleteMultiparts = action.payload;
      break;
    }
    case RuleActionType.RULE_ACTIONS_DELETE_MARKERS: {
      newState.ruleActions.deleteExpiredMarkers = action.payload;
      break;
    }
    case RuleActionType.RULE_ACTIONS_TRANSITION_CURRENT: {
      newState.ruleActions.transitionCurrent = action.payload;
      break;
    }
    case RuleActionType.RULE_ACTIONS_TRANSITION_NON_CURRENT: {
      newState.ruleActions.transitionNonCurrent = action.payload;
      break;
    }
    default:
      throw new TypeError(`${action} is not a valid reducer action`);
  }
  return newState;
};
