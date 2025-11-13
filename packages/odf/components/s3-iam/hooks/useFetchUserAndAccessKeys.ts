import * as React from 'react';
import { User, AccessKeyMetadata, Tag } from '@aws-sdk/client-iam';
import {
  LIST_ACCESS_KEYS,
  LIST_USER,
  LIST_USER_TAGS,
  S3IAMCommands,
} from '@odf/shared/iam';
import useSWR from 'swr';

export type UseFetchUserAndAccessKeysProps = {
  userDetails: User;
  iamAccessKeys: AccessKeyMetadata[];
  tags: Tag[];
  hasActiveAccessKeys: boolean;
  isLoading: boolean;
  error: any;
  refetchAll: () => Promise<void>;
};

/**
 * React hook to fetch IAM user details and their access keys
 *
 * @param userName - IAM user name
 * @param noobaaS3IAM - S3 IAM commands instance
 * @returns User details, access keys, loading state, error and refetchAll
 */
export const useFetchUserAndAccessKeys = (
  userName: string,
  noobaaS3IAM: S3IAMCommands
): UseFetchUserAndAccessKeysProps => {
  // Fetch user details
  const {
    data: iamUserResponse,
    isLoading: loadingUsers,
    error: errorUsers,
    mutate: refreshUser,
  } = useSWR(`${userName}-${LIST_USER}`, () =>
    noobaaS3IAM.getIAMUser({ UserName: userName })
  );

  // Fetch access keys
  const {
    data: accessKeysResponse,
    isLoading: loadingAccesskeys,
    error: errorAccesskeys,
    mutate: refreshAccessKey,
  } = useSWR(`${userName}-${LIST_ACCESS_KEYS}`, () =>
    noobaaS3IAM.listAccessKeys({ UserName: userName })
  );

  // Fetch user tags
  const {
    data: tagsResponse,
    isLoading: loadingTags,
    error: errorTags,
    mutate: refreshTags,
  } = useSWR(`${userName}-${LIST_USER_TAGS}`, () =>
    noobaaS3IAM.listUserTags({ UserName: userName })
  );

  const userDetails = iamUserResponse?.User;
  const tags = tagsResponse?.Tags || [];

  const iamAccessKeys = React.useMemo(
    () => accessKeysResponse?.AccessKeyMetadata || [],
    [accessKeysResponse]
  );

  const hasActiveAccessKeys = React.useMemo(() => {
    return iamAccessKeys?.some((ak) => ak.Status === 'Active') ?? false;
  }, [iamAccessKeys]);

  const isLoading = loadingUsers || loadingAccesskeys || loadingTags;
  const error = errorUsers || errorAccesskeys || errorTags;
  const refetchAll = async () => {
    await Promise.all([refreshUser(), refreshAccessKey(), refreshTags()]);
  };

  return {
    userDetails,
    iamAccessKeys,
    tags,
    hasActiveAccessKeys,
    isLoading,
    error,
    refetchAll,
  };
};
