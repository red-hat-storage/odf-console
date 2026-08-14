import {
  GetBucketLifecycleConfigurationCommandOutput,
  Tag,
} from '@aws-sdk/client-s3';
import { RuleScope, RuleState } from './reducer';

// Rule name validations
export const isInvalidName = (
  state: RuleState,
  existingRules: GetBucketLifecycleConfigurationCommandOutput,
  isEdit = false,
  editingRuleName = ''
) => {
  const emptyName = !state.generalConfig.name;
  const alreadyUsedName = isEdit
    ? existingRules?.Rules?.some(
        (rule) =>
          rule.ID === state.generalConfig.name && rule.ID !== editingRuleName
      )
    : existingRules?.Rules?.some(
        (rule) => rule.ID === state.generalConfig.name
      );
  const exceedingLengthName = state.generalConfig.name.length > 255;
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
    state.generalConfig.scope === RuleScope.TARGETED &&
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
    state.generalConfig.scope === RuleScope.TARGETED &&
    (emptyKey || alreadyUsedKey);
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
  state.generalConfig.scope === RuleScope.TARGETED &&
  !state.conditionalFilters.prefix &&
  !state.conditionalFilters.objectTags.length &&
  !state.conditionalFilters.minObjectSize.isChecked &&
  !state.conditionalFilters.maxObjectSize.isChecked;

// Rule actions validations
export const isInvalidActionsCount = (
  state: RuleState,
  isDeepArchiveEnabled = false
) => {
  let actionsCount = 0;
  const ruleActions = state.ruleActions;
  Object.keys(ruleActions).forEach((action) => {
    // Skip transition actions if Deep Archive is not enabled
    if (
      !isDeepArchiveEnabled &&
      (action === 'transitionCurrent' || action === 'transitionNonCurrent')
    ) {
      return;
    }
    if (ruleActions[action]?.isChecked || ruleActions[action] === true) {
      actionsCount++;
    }
  });
  return [!actionsCount, actionsCount];
};

export const isInvalidDeleteCurrent = (state: RuleState) =>
  state.ruleActions.deleteCurrent.isChecked &&
  state.ruleActions.deleteCurrent.days < 1;

export const isInvalidDeleteNonCurrent = (state: RuleState) =>
  state.ruleActions.deleteNonCurrent.isChecked &&
  state.ruleActions.deleteNonCurrent.days < 1;

export const isInvalidDeleteMultiparts = (state: RuleState) =>
  state.ruleActions.deleteIncompleteMultiparts.isChecked &&
  state.ruleActions.deleteIncompleteMultiparts.days < 1;

export const isInvalidTransitionCurrent = (state: RuleState) =>
  state.ruleActions.transitionCurrent.isChecked &&
  state.ruleActions.transitionCurrent.days < 1;

export const isInvalidTransitionNonCurrent = (state: RuleState) =>
  state.ruleActions.transitionNonCurrent.isChecked &&
  state.ruleActions.transitionNonCurrent.days < 1;

export const areInvalidActions = (
  state: RuleState,
  isDeepArchiveEnabled = false
) =>
  isInvalidDeleteCurrent(state) ||
  isInvalidDeleteNonCurrent(state) ||
  isInvalidDeleteMultiparts(state) ||
  (isDeepArchiveEnabled && isInvalidTransitionCurrent(state)) ||
  (isDeepArchiveEnabled && isInvalidTransitionNonCurrent(state));

// Cummulative validations
export const isInvalidLifecycleRule = (
  state: RuleState,
  existingRules: GetBucketLifecycleConfigurationCommandOutput,
  isEdit = false,
  editingRuleName = '',
  isDeepArchiveEnabled = false
) =>
  isInvalidName(state, existingRules, isEdit, editingRuleName)[0] ||
  isInvalidObjectSize(state)[0] ||
  areInvalidObjectTags(state) ||
  areInvalidFilters(state) ||
  isInvalidActionsCount(state, isDeepArchiveEnabled)[0] ||
  areInvalidActions(state, isDeepArchiveEnabled);
