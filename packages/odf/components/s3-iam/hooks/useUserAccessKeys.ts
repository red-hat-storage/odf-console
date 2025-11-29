import * as React from 'react';
import {
  AccessKeyMetadata,
  ListAccessKeysCommandOutput,
} from '@aws-sdk/client-iam';
import { AccessKeyStatus, LIST_ACCESS_KEYS } from '@odf/core/constants/s3-iam';
import { IamCommands } from '@odf/shared/iam';
import useSWR, { KeyedMutator } from 'swr';

export type UseUserAccessKeysReturn = {
  iamAccessKeys: AccessKeyMetadata[];
  hasActiveAccessKeys: boolean;
  isLoading: boolean;
  error: any;
  refetch: KeyedMutator<ListAccessKeysCommandOutput>;
};

/**
 * React hook to fetch user access keys
 *
 * @param userName - IAM user name
 * @param iamClient - IAM commands instance
 * @returns Access keys, loading state, error and refetch function
 */
export const useUserAccessKeys = (
  userName: string,
  iamClient: IamCommands
): UseUserAccessKeysReturn => {
  const {
    data: accessKeysResponse,
    isLoading,
    error,
    mutate: refetch,
  } = useSWR(`${userName}-${LIST_ACCESS_KEYS}`, () =>
    iamClient.listAccessKeys({ UserName: userName })
  );
  const iamAccessKeys = React.useMemo(
    () => accessKeysResponse?.AccessKeyMetadata || [],
    [accessKeysResponse]
  );
  const hasActiveAccessKeys =
    iamAccessKeys?.some((ak) => ak.Status === AccessKeyStatus.ACTIVE) ?? false;

  return {
    iamAccessKeys,
    hasActiveAccessKeys,
    isLoading,
    error,
    refetch,
  };
};
