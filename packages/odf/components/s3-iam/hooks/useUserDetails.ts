import { User } from '@aws-sdk/client-iam';
import { LIST_IAM_USER } from '@odf/core/constants/s3-iam';
import { IamCommands } from '@odf/shared/iam';
import useSWR from 'swr';

export type UseUserDetailsReturn = {
  userDetails: User;
  isLoading: boolean;
  error: any;
  refreshTokens: () => Promise<void>;
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
    mutate,
  } = useSWR(`${userName}-${LIST_IAM_USER}`, () =>
    iamClient.getIamUser({ UserName: userName })
  );

  const userDetails = iamUserResponse?.User;

  const refreshTokens = async () => {
    try {
      await mutate();
    } catch (err) {
      // Error is handled by useSWR's error state
      // eslint-disable-next-line no-console
      console.error('Error fetching user details:', err);
    }
  };

  return {
    userDetails,
    isLoading,
    error,
    refreshTokens,
  };
};
