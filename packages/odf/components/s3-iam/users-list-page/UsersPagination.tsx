import * as React from 'react';
import { MAX_USERS, LIST_USERS } from '@odf/core/constants/s3-iam';
import { IAMUsers } from '@odf/core/types';
import useSWRMutation from 'swr/mutation';
import {
  ContinuationTokens,
  continuationTokensRefresher,
  fetchS3Resources,
  getPaginationCount,
  Pagination,
} from '../../s3-browser/pagination-helper';
import { IamContext } from '../iam-context';

export const UsersPagination: React.FC<UsersPaginationProps> = ({
  setUsersInfo,
}) => {
  const { iamClient } = React.useContext(IamContext);

  const fetchUsersList = React.useCallback(
    (_url: string, { arg }: { arg?: string }) =>
      iamClient.listIAMUsers({
        MaxItems: MAX_USERS,
        ...(arg && { Marker: arg }),
      }),
    [iamClient]
  );

  const {
    data: usersResponse,
    isMutating,
    trigger,
    error,
  } = useSWRMutation(LIST_USERS, fetchUsersList);

  const [iamUsers, setIAMUsers] = React.useState<IAMUsers[]>([]);
  const [isLoadingAccessKeys, setIsLoadingAccessKeys] = React.useState(false);
  const [accessKeysError, setAccessKeysError] = React.useState<any>(null);

  const loadedWOError = !isMutating && !error;
  // Continuation tokens for API-side pagination
  const [continuationTokens, setContinuationTokens] =
    React.useState<ContinuationTokens>({
      previous: [],
      current: '',
      next: '',
    });

  // Fetch access keys directly when users change
  React.useEffect(() => {
    const fetchAccessKeys = async () => {
      const users = usersResponse?.Users;

      if (!users || users.length === 0) {
        setIAMUsers([]);
        setIsLoadingAccessKeys(false);
        return;
      }

      setIsLoadingAccessKeys(true);
      setAccessKeysError(null);

      try {
        // Fetch access keys for all users in parallel
        const usersWithAccessKeys = await Promise.all(
          users.map(async (user) => {
            try {
              const response = await iamClient.listAccessKeys({
                UserName: user.UserName,
              });
              return {
                userDetails: user,
                accessKeys: response.AccessKeyMetadata || [],
              };
            } catch (err) {
              // eslint-disable-next-line no-console
              console.error(
                `Failed to fetch access keys for ${user.UserName}:`,
                err
              );
              return {
                userDetails: user,
                accessKeys: [],
              };
            }
          })
        );
        setIAMUsers(usersWithAccessKeys);
        setIsLoadingAccessKeys(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch access keys:', err);
        setAccessKeysError(err);
        setIsLoadingAccessKeys(false);
      }
    };

    fetchAccessKeys();
  }, [usersResponse, iamClient]);

  // Update usersInfo with users + access keys
  React.useEffect(() => {
    setUsersInfo([
      iamUsers,
      isMutating || isLoadingAccessKeys,
      error || accessKeysError,
    ]);
  }, [
    iamUsers,
    isMutating,
    isLoadingAccessKeys,
    error,
    accessKeysError,
    setUsersInfo,
  ]);

  // Update continuation tokens when response arrives
  React.useEffect(() => {
    if (usersResponse && !isMutating && !error) {
      setContinuationTokens((oldTokens) => ({
        ...oldTokens,
        next: usersResponse.IsTruncated ? usersResponse.Marker || '' : '',
      }));
    }
  }, [usersResponse, isMutating, error]);

  // Initialize pagination on mount
  React.useEffect(() => {
    continuationTokensRefresher(
      setContinuationTokens,
      trigger,
      undefined, // setSelectedRows
      false // containsNextContinuation - IAM uses Marker instead of NextContinuationToken
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNextClick = async () => {
    if (continuationTokens.next && loadedWOError) {
      fetchS3Resources(
        setContinuationTokens,
        trigger,
        true,
        continuationTokens.next,
        undefined, // setSelectedRows
        false // containsNextContinuation - IAM uses Marker instead of NextContinuationToken
      );
    }
  };

  const onPreviousClick = async () => {
    if (continuationTokens.current && loadedWOError) {
      const marker =
        continuationTokens.previous[continuationTokens.previous.length - 1];
      fetchS3Resources(
        setContinuationTokens,
        trigger,
        false,
        marker,
        undefined, // setSelectedRows
        false // containsNextContinuation - IAM uses Marker instead of NextContinuationToken
      );
    }
  };

  const [paginationToCount, paginationFromCount] = getPaginationCount(
    continuationTokens,
    usersResponse?.Users?.length || 0,
    MAX_USERS
  );

  return (
    <Pagination
      disableNext={!continuationTokens.next || !loadedWOError}
      disablePrevious={!continuationTokens.current || !loadedWOError}
      onNext={onNextClick}
      onPrevious={onPreviousClick}
      fromCount={paginationFromCount}
      toCount={paginationToCount}
    />
  );
};

type UsersPaginationProps = {
  setUsersInfo: React.Dispatch<[IAMUsers[], boolean, any]>;
};
