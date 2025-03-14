import * as _ from 'lodash-es';

export enum AllowedMethods {
  GET = 'GET',
  PUT = 'PUT',
  POST = 'POST',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
}

export type StateAndDispatchProps = {
  state: RuleState;
  dispatch: React.Dispatch<RuleAction>;
};

export type RuleState = {
  name: string;
  allowedOrigins: string[];
  allowAllOrigins: boolean;
  allowedMethods: AllowedMethods[];
  allowedHeaders: string[];
  allowAllHeaders: boolean;
  exposedHeaders: string[];
  maxAge: number;
  triggerInlineValidations: boolean;
};

export const ruleInitialState: RuleState = {
  name: '',
  allowedOrigins: [],
  allowAllOrigins: false,
  allowedMethods: [],
  allowedHeaders: [],
  allowAllHeaders: false,
  exposedHeaders: [],
  maxAge: 0,
  triggerInlineValidations: false,
};

export enum RuleActionType {
  RULE = 'RULE',
  RULE_NAME = 'RULE_NAME',
  RULE_ORIGINS = 'RULE_ORIGINS',
  RULE_ALLOW_ALL_ORIGINS = 'RULE_ALLOW_ALL_ORIGINS',
  RULE_METHODS = 'RULE_METHODS',
  RULE_HEADERS = 'RULE_HEADERS',
  RULE_ALLOW_ALL_HEADERS = 'RULE_ALLOW_ALL_HEADERS',
  RULE_EXPOSED_HEADERS = 'RULE_EXPOSED_HEADERS',
  RULE_MAX_AGE = 'RULE_MAX_AGE',
  TRIGGER_INLINE_VALIDATIONS = 'TRIGGER_INLINE_VALIDATIONS',
}

export type RuleAction =
  | { type: RuleActionType.RULE; payload: RuleState }
  | { type: RuleActionType.RULE_NAME; payload: string }
  | { type: RuleActionType.RULE_ORIGINS; payload: string[] }
  | { type: RuleActionType.RULE_ALLOW_ALL_ORIGINS; payload: boolean }
  | { type: RuleActionType.RULE_METHODS; payload: AllowedMethods[] }
  | { type: RuleActionType.RULE_HEADERS; payload: string[] }
  | { type: RuleActionType.RULE_ALLOW_ALL_HEADERS; payload: boolean }
  | { type: RuleActionType.RULE_EXPOSED_HEADERS; payload: string[] }
  | { type: RuleActionType.RULE_MAX_AGE; payload: number }
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
    case RuleActionType.RULE_ORIGINS: {
      newState.allowedOrigins = action.payload;
      break;
    }
    case RuleActionType.RULE_ALLOW_ALL_ORIGINS: {
      newState.allowAllOrigins = action.payload;
      break;
    }
    case RuleActionType.RULE_METHODS: {
      newState.allowedMethods = action.payload;
      break;
    }
    case RuleActionType.RULE_HEADERS: {
      newState.allowedHeaders = action.payload;
      break;
    }
    case RuleActionType.RULE_ALLOW_ALL_HEADERS: {
      newState.allowAllHeaders = action.payload;
      break;
    }
    case RuleActionType.RULE_EXPOSED_HEADERS: {
      newState.exposedHeaders = action.payload;
      break;
    }
    case RuleActionType.RULE_MAX_AGE: {
      newState.maxAge = action.payload;
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
