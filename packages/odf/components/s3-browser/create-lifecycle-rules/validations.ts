import {
  GetBucketLifecycleConfigurationCommandOutput,
  Tag,
} from '@aws-sdk/client-s3';
import { RuleScope, RuleState } from './reducer';

// Rule name validations
export const isInvalidName = (
  state: RuleState,
  existingRules: GetBucketLifecycleConfigurationCommandOutput
) => {
  const emptyName = !state.name;
  const alreadyUsedName = existingRules?.Rules?.some(
    (rule) => rule.ID === state.name
  );
  const exceedingLengthName = state.name.length > 255;
  const invalidName =
    emptyName || alreadyUsedName || exceedingLengthName || false;
  return [invalidName, emptyName, alreadyUsedName, exceedingLengthName];
};

// Rule filters validations
export const isInvalidObjectSize = (state: RuleState) => {
  const invalidMinSize =
    state.conditionalFilters.minObjectSize.isChecked &&
    state.conditionalFilters.minObjectSize.sizeInB < 0;
  const invalidMaxSize =
    state.conditionalFilters.maxObjectSize.isChecked &&
    state.conditionalFilters.maxObjectSize.sizeInB < 1;
  const invalidSize =
    state.conditionalFilters.minObjectSize.isChecked &&
    !invalidMinSize &&
    state.conditionalFilters.maxObjectSize.isChecked &&
    !invalidMaxSize &&
    state.conditionalFilters.minObjectSize.sizeInB >=
      state.conditionalFilters.maxObjectSize.sizeInB;
  const invalidObjectSize =
    state.scope === RuleScope.TARGETED &&
    (invalidMinSize || invalidMaxSize || invalidSize);
  return [invalidObjectSize, invalidMinSize, invalidMaxSize, invalidSize];
};

export const isInvalidObjectTag = (
  state: RuleState,
  tag: Tag,
  index: number
) => {
  const tags: Tag[] = state.conditionalFilters.objectTags;
  const emptyKey = !tag.Key;
  const alreadyUsedKey =
    !emptyKey && tags.some((t, idx) => idx !== index && t.Key === tag.Key);
  const invalidTag =
    state.scope === RuleScope.TARGETED && (emptyKey || alreadyUsedKey);
  return [invalidTag, emptyKey, alreadyUsedKey];
};

export const areInvalidObjectTags = (state: RuleState) => {
  const objectTags: Tag[] = state.conditionalFilters.objectTags;
  return objectTags.some(
    (objectTag, index) =>
      isInvalidObjectTag(state, objectTag, index)[0] === true
  );
};

export const areInvalidFilters = (state: RuleState) =>
  state.scope === RuleScope.TARGETED &&
  !state.conditionalFilters.prefix &&
  !state.conditionalFilters.objectTags.length &&
  !state.conditionalFilters.minObjectSize.isChecked &&
  !state.conditionalFilters.maxObjectSize.isChecked;

// Rule actions validations
export const isInvalidActionsCount = (state: RuleState) => {
  let actionsCount = 0;
  const ruleActions = state.actions;
  Object.keys(ruleActions).forEach((action) => {
    if (ruleActions[action]?.isChecked || ruleActions[action] === true) {
      actionsCount++;
    }
  });
  return [!actionsCount, actionsCount];
};

export const isInvalidDeleteCurrent = (state: RuleState) =>
  state.actions.deleteCurrent.isChecked && state.actions.deleteCurrent.days < 1;

export const isInvalidDeleteNonCurrent = (state: RuleState) =>
  state.actions.deleteNonCurrent.isChecked &&
  state.actions.deleteNonCurrent.days < 1;

export const isInvalidDeleteMultiparts = (state: RuleState) =>
  state.actions.deleteIncompleteMultiparts.isChecked &&
  state.actions.deleteIncompleteMultiparts.days < 1;

export const areInvalidActions = (state: RuleState) =>
  isInvalidDeleteCurrent(state) ||
  isInvalidDeleteNonCurrent(state) ||
  isInvalidDeleteMultiparts(state);

// Cummulative validations
export const isInvalidLifecycleRule = (
  state: RuleState,
  existingRules: GetBucketLifecycleConfigurationCommandOutput
) =>
  isInvalidName(state, existingRules)[0] ||
  isInvalidObjectSize(state)[0] ||
  areInvalidObjectTags(state) ||
  areInvalidFilters(state) ||
  isInvalidActionsCount(state)[0] ||
  areInvalidActions(state);
