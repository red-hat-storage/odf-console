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

export type RuleState = {
  name: string;
  scope: RuleScope;
  conditionalFilters: {
    prefix: string;
    objectTags: Tag[];
    maxObjectSize: ObjectSize;
    minObjectSize: ObjectSize;
  };
  actions: {
    deleteCurrent: DeleteObject;
    deleteNonCurrent: DeleteNonCurrent;
    deleteIncompleteMultiparts: DeleteObject;
    deleteExpiredMarkers: boolean;
  };
  triggerInlineValidations: boolean;
};

export const ruleInitialState: RuleState = {
  name: '',
  scope: RuleScope.TARGETED,
  conditionalFilters: {
    prefix: '',
    objectTags: [],
    maxObjectSize: {
      isChecked: false,
      size: 0,
      unit: SizeUnit.KiB,
      sizeInB: 0,
    },
    minObjectSize: {
      isChecked: false,
      size: 0,
      unit: SizeUnit.KiB,
      sizeInB: 0,
    },
  },
  actions: {
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
  },
  triggerInlineValidations: false,
};

export enum RuleActionType {
  RULE = 'RULE',
  RULE_NAME = 'RULE_NAME',
  RULE_SCOPE = 'RULE_SCOPE',
  RULE_PREFIX_FILTER = 'RULE_PREFIX_FILTER',
  RULE_TAGS_FILTER = 'RULE_TAGS_FILTER',
  RULE_MIN_SIZE_FILTER = 'RULE_MIN_SIZE_FILTER',
  RULE_MAX_SIZE_FILTER = 'RULE_MAX_SIZE_FILTER',
  RULE_DELETE_CURRENT_ACTION = 'RULE_DELETE_CURRENT_ACTION',
  RULE_DELETE_NON_CURRENT_ACTION = 'RULE_DELETE_NON_CURRENT_ACTION',
  RULE_DELETE_MULTIPARTS_ACTION = 'RULE_DELETE_MULTIPARTS_ACTION',
  RULE_DELETE_MARKERS_ACTION = 'RULE_DELETE_MARKERS_ACTION',
  TRIGGER_INLINE_VALIDATIONS = 'TRIGGER_INLINE_VALIDATIONS',
}

export type RuleAction =
  | { type: RuleActionType.RULE; payload: RuleState }
  | { type: RuleActionType.RULE_NAME; payload: string }
  | { type: RuleActionType.RULE_SCOPE; payload: RuleScope }
  | { type: RuleActionType.RULE_PREFIX_FILTER; payload: string }
  | { type: RuleActionType.RULE_TAGS_FILTER; payload: Tag[] }
  | { type: RuleActionType.RULE_MIN_SIZE_FILTER; payload: ObjectSize }
  | { type: RuleActionType.RULE_MAX_SIZE_FILTER; payload: ObjectSize }
  | { type: RuleActionType.RULE_DELETE_CURRENT_ACTION; payload: DeleteObject }
  | {
      type: RuleActionType.RULE_DELETE_NON_CURRENT_ACTION;
      payload: DeleteNonCurrent;
    }
  | {
      type: RuleActionType.RULE_DELETE_MULTIPARTS_ACTION;
      payload: DeleteObject;
    }
  | { type: RuleActionType.RULE_DELETE_MARKERS_ACTION; payload: boolean }
  | { type: RuleActionType.TRIGGER_INLINE_VALIDATIONS; payload: boolean };

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
    case RuleActionType.RULE_NAME: {
      newState.name = action.payload;
      break;
    }
    case RuleActionType.RULE_SCOPE: {
      newState.scope = action.payload;
      break;
    }
    case RuleActionType.RULE_PREFIX_FILTER: {
      newState.conditionalFilters.prefix = action.payload;
      break;
    }
    case RuleActionType.RULE_TAGS_FILTER: {
      newState.conditionalFilters.objectTags = action.payload;
      break;
    }
    case RuleActionType.RULE_MIN_SIZE_FILTER: {
      newState.conditionalFilters.minObjectSize = action.payload;
      break;
    }
    case RuleActionType.RULE_MAX_SIZE_FILTER: {
      newState.conditionalFilters.maxObjectSize = action.payload;
      break;
    }
    case RuleActionType.RULE_DELETE_CURRENT_ACTION: {
      newState.actions.deleteCurrent = action.payload;
      break;
    }
    case RuleActionType.RULE_DELETE_NON_CURRENT_ACTION: {
      newState.actions.deleteNonCurrent = action.payload;
      break;
    }
    case RuleActionType.RULE_DELETE_MULTIPARTS_ACTION: {
      newState.actions.deleteIncompleteMultiparts = action.payload;
      break;
    }
    case RuleActionType.RULE_DELETE_MARKERS_ACTION: {
      newState.actions.deleteExpiredMarkers = action.payload;
      break;
    }
    case RuleActionType.TRIGGER_INLINE_VALIDATIONS: {
      newState.triggerInlineValidations = action.payload;
      break;
    }
    default:
      throw new TypeError(`${action} is not a valid reducer action`);
  }
  return newState;
};
