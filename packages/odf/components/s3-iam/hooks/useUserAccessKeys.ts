import { AccessKeyMetadata } from '@aws-sdk/client-iam';
import { LIST_IAM_USER_ACCESS_KEYS } from '@odf/core/constants/s3-iam';
import { IamCommands } from '@odf/shared/iam';
import useSWR from 'swr';

export type UseUserAccessKeysReturn = {
  iamAccessKeys: AccessKeyMetadata[];
  isLoading: boolean;
  error: Error | null;
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
  } = useSWR(`${userName}-${LIST_IAM_USER_ACCESS_KEYS}`, () =>
    iamClient.listAccessKeys({ UserName: userName })
  );

  const iamAccessKeys = accessKeysResponse?.AccessKeyMetadata || [];

  return {
    iamAccessKeys,
    isLoading,
    error,
  };
};
