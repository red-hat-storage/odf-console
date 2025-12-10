import { User } from '@aws-sdk/client-iam';
import { GET_IAM_USER } from '@odf/core/constants/s3-iam';
import { IamCommands } from '@odf/shared/iam';
import useSWR from 'swr';

export type UseUserDetailsReturn = {
  userDetails: User;
  isLoading: boolean;
  error: Error | null;
};

/**
 * React hook to fetch IAM user details
 *
 * @param userName - IAM user name
 * @param iamClient - IAM commands instance
 * @returns User details, loading state, error and refreshTokens function
 */
export const useUserDetails = (
  userName: string,
  iamClient: IamCommands
): UseUserDetailsReturn => {
  const {
    data: iamUserResponse,
    isLoading,
    error,
  } = useSWR(`${userName}-${GET_IAM_USER}`, () =>
    iamClient.getIamUser({ UserName: userName })
  );

  const userDetails = iamUserResponse?.User;

  return {
    userDetails,
    isLoading,
    error,
  };
};
