import { AccessKeyMetadata } from '@aws-sdk/client-iam';
import {
  AccessKeyStatus,
  LIST_IAM_USER_ACCESS_KEYS,
} from '@odf/core/constants/s3-iam';
import { IamCommands } from '@odf/shared/iam';
import useSWR from 'swr';

export type UseUserAccessKeysReturn = {
  iamAccessKeys: AccessKeyMetadata[];
  hasActiveAccessKeys: boolean;
  isLoading: boolean;
  error: any;
  refreshTokens: () => Promise<void>;
};

/**
 * React hook to fetch user access keys
 *
 * @param userName - IAM user name
 * @param iamClient - IAM commands instance
 * @returns Access keys, loading state, error and refreshTokens function
 */
export const useUserAccessKeys = (
  userName: string,
  iamClient: IamCommands
): UseUserAccessKeysReturn => {
  const {
    data: accessKeysResponse,
    isLoading,
    error,
    mutate,
  } = useSWR(`${userName}-${LIST_IAM_USER_ACCESS_KEYS}`, () =>
    iamClient.listAccessKeys({ UserName: userName })
  );

  const iamAccessKeys = accessKeysResponse?.AccessKeyMetadata || [];

  const hasActiveAccessKeys =
    iamAccessKeys?.some((ak) => ak.Status === AccessKeyStatus.ACTIVE) ?? false;

  const refreshTokens = async () => {
    try {
      await mutate();
    } catch (err) {
      // Error is handled by useSWR's error state
      // eslint-disable-next-line no-console
      console.error('Error fetching access keys:', err);
    }
  };

  return {
    iamAccessKeys,
    hasActiveAccessKeys,
    isLoading,
    error,
    refreshTokens,
  };
};
