import { GetBucketCorsCommandOutput } from '@aws-sdk/client-s3';
import { RuleState } from './reducer';

// Rule name validations
export const isInvalidName = (
  state: RuleState,
  existingRules: GetBucketCorsCommandOutput,
  isEdit = false,
  editingRuleName = ''
) => {
  const emptyName = !state.name;
  const alreadyUsedName = isEdit
    ? existingRules?.CORSRules?.some(
        (rule) => rule.ID === state.name && rule.ID !== editingRuleName
      )
    : existingRules?.CORSRules?.some((rule) => rule.ID === state.name);
  const exceedingLengthName = state.name.length > 255;
  const invalidName =
    emptyName || alreadyUsedName || exceedingLengthName || false;
  return [invalidName, emptyName, alreadyUsedName, exceedingLengthName];
};

// "AllowedOrigins" validations
// Using an empty string ("") is interpreted as a valid value as per S3 CORS configuration
export const isInvalidOrigin = (state: RuleState) =>
  !state.allowedOrigins.length;

// "AllowedMethods" validations
// Using an empty string ("") is interpreted as a valid value as per S3 CORS configuration
export const isInvalidMethod = (state: RuleState) =>
  !state.allowedMethods.length;

// Cummulative validations
export const isInvalidCorsRule = (
  state: RuleState,
  existingRules: GetBucketCorsCommandOutput,
  isEdit = false,
  editingRuleName = ''
) =>
  isInvalidName(state, existingRules, isEdit, editingRuleName)[0] ||
  isInvalidOrigin(state) ||
  isInvalidMethod(state);
