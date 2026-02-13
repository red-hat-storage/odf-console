import { ListUsersCommandOutput } from '@aws-sdk/client-iam';
import { IamCommands } from '@odf/shared/iam';
import { TFunction } from 'react-i18next';
import { ValidatedOptions } from '@patternfly/react-core';
import {
  TAG_KEY_MIN_LENGTH,
  TAG_KEY_MAX_LENGTH,
  TAG_VALUE_MAX_LENGTH,
  TAG_ALLOWED_CHARS_REGEX,
  TAG_VALUE_ALLOWED_CHARS_REGEX,
} from '../constants/s3-iam';
import { IamUserCrFormat } from '../types';

export const convertUsersDataToCrFormat = (
  listUsersCommandOutput: ListUsersCommandOutput
): IamUserCrFormat[] =>
  listUsersCommandOutput?.Users.map((user) => ({
    metadata: {
      name: user.UserName,
      uid: user.UserId,
      creationTimestamp: user.CreateDate.toString(),
    },
    ...user,
  })) || [];

// Tag validation utilities
export const getKeyValidations = (
  key: string,
  t: TFunction
): [ValidatedOptions, string] => {
  const hasMinLengthError = key.length < TAG_KEY_MIN_LENGTH;
  const hasMaxLengthError = key.length > TAG_KEY_MAX_LENGTH;
  const hasInvalidChars = !TAG_ALLOWED_CHARS_REGEX.test(key);

  if (hasMinLengthError || hasMaxLengthError || hasInvalidChars) {
    return [
      ValidatedOptions.error,
      t(
        `Key must be at least ${TAG_KEY_MIN_LENGTH} character, cannot exceed ${TAG_KEY_MAX_LENGTH} characters, and can only contain letters, numbers, spaces, and the following special characters: _ . : / = + - @`
      ),
    ];
  } else if (key.length > 0) {
    return [
      ValidatedOptions.success,
      t(
        `Key must be between ${TAG_KEY_MIN_LENGTH} and ${TAG_KEY_MAX_LENGTH} characters. Use a combination of letters, numbers, spaces and special characters.`
      ),
    ];
  } else {
    return [
      ValidatedOptions.default,
      t(
        `Key must be at least ${TAG_KEY_MIN_LENGTH} character, cannot exceed ${TAG_KEY_MAX_LENGTH} characters. Use a combination of letters, numbers, spaces and special characters.`
      ),
    ];
  }
};

export const getValueValidations = (
  value: string,
  t: TFunction
): [ValidatedOptions, string] => {
  const hasMaxLengthError = value.length > TAG_VALUE_MAX_LENGTH;
  const hasInvalidChars =
    value.length > 0 && !TAG_VALUE_ALLOWED_CHARS_REGEX.test(value);

  if (hasMaxLengthError || hasInvalidChars) {
    return [
      ValidatedOptions.error,
      t(
        `Value cannot exceed ${TAG_VALUE_MAX_LENGTH} characters and can only contain letters, numbers, spaces, and the following special characters: _ . : / = + - @`
      ),
    ];
  } else if (value.length > 0) {
    return [
      ValidatedOptions.success,
      t(
        `Maximum ${TAG_VALUE_MAX_LENGTH} characters. Use a combination of letters, numbers, spaces and special characters.`
      ),
    ];
  } else {
    return [
      ValidatedOptions.default,
      t(
        `Maximum ${TAG_VALUE_MAX_LENGTH} characters. Use a combination of letters, numbers, spaces and special characters.`
      ),
    ];
  }
};

export const cleanupAllPolicies = async (
  iamClient: IamCommands,
  userName: string
): Promise<void> => {
  // List and delete all inline user policies
  let isTruncated = true;
  let marker: string | undefined;
  do {
    // eslint-disable-next-line no-await-in-loop
    const inlinePoliciesResponse = await iamClient.listUserPolicies({
      UserName: userName,
      Marker: marker,
    });

    if (inlinePoliciesResponse.PolicyNames) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.allSettled(
        inlinePoliciesResponse.PolicyNames.map((policyName) =>
          iamClient.deleteUserPolicy({
            UserName: userName,
            PolicyName: policyName,
          })
        )
      );
    }

    isTruncated = inlinePoliciesResponse.IsTruncated ?? false;
    marker = inlinePoliciesResponse.Marker;
  } while (isTruncated);
};
