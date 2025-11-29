import { GetUserCommandOutput, User } from '@aws-sdk/client-iam';
import { LIST_USER } from '@odf/core/constants/s3-iam';
import { IamCommands } from '@odf/shared/iam';
import useSWR, { KeyedMutator } from 'swr';

export type UseUserDetailsReturn = {
  userDetails: User;
  isLoading: boolean;
  error: any;
  refetch: KeyedMutator<GetUserCommandOutput>;
};

/**
 * React hook to fetch IAM user details
 *
 * @param userName - IAM user name
 * @param iamClient - IAM commands instance
 * @returns User details, loading state, error and refetch function
 */
export const useUserDetails = (
  userName: string,
  iamClient: IamCommands
): UseUserDetailsReturn => {
  const {
    data: iamUserResponse,
    isLoading,
    error,
    mutate: refetch,
  } = useSWR(`${userName}-${LIST_USER}`, () =>
    iamClient.getIAMUser({ UserName: userName })
  );

  const userDetails = iamUserResponse?.User;

  return {
    userDetails,
    isLoading,
    error,
    refetch,
  };
};
