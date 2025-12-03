import * as React from 'react';
import { ListUsersCommandOutput } from '@aws-sdk/client-iam';
import { MAX_USERS, LIST_IAM_USERS } from '@odf/core/constants/s3-iam';
import { IamUserCrFormat } from '@odf/core/types';
import { convertUsersDataToCrFormat } from '@odf/core/utils/s3-iam';
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
    (_url: string, { arg }: { arg: string }) =>
      iamClient.listIamUsers({
        MaxItems: MAX_USERS,
        ...(!!arg && { Marker: arg }),
      }),
    [iamClient]
  );

  const {
    data: usersResponse,
    isMutating,
    trigger,
    error,
  } = useSWRMutation(LIST_IAM_USERS, fetchUsersList);

  const loadedWOError = !isMutating && !error;
  const [continuationTokens, setContinuationTokens] =
    React.useState<ContinuationTokens>({
      previous: [],
      current: '',
      next: '',
    });

  React.useEffect(() => {
    setUsersInfo([
      convertUsersDataToCrFormat(usersResponse),
      !isMutating,
      error,
    ]);
  }, [setUsersInfo, usersResponse, isMutating, error]);

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
      fetchS3Resources<ListUsersCommandOutput>(
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
  setUsersInfo: React.Dispatch<[IamUserCrFormat[], boolean, any]>;
};
