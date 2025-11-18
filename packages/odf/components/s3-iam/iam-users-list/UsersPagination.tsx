import * as React from 'react';
import { User } from '@aws-sdk/client-iam';
import { LIST_USERS, MAX_USERS } from '@odf/shared/iam';
import useSWRMutation from 'swr/mutation';
import { NoobaaS3IAMContext } from '../iam-context';
import {
  IAMContinuationTokens,
  continuationTokensRefresher,
  fetchIAMUsers,
  getPaginationCount,
  Pagination,
} from '../pagination-helper';

export const UsersPagination: React.FC<UsersPaginationProps> = ({
  setUsersInfo,
}) => {
  const { noobaaS3IAM } = React.useContext(NoobaaS3IAMContext);

  const {
    data: usersResponse,
    isMutating,
    trigger,
    error,
  } = useSWRMutation(LIST_USERS, (_url, { arg }: { arg?: string }) =>
    noobaaS3IAM.listIAMUsers({
      MaxItems: MAX_USERS,
      ...(arg && { Marker: arg }),
    })
  );
  const loadedWOError = !isMutating && !error;
  // Continuation tokens for API-side pagination
  const [continuationTokens, setContinuationTokens] =
    React.useState<IAMContinuationTokens>({
      previous: [],
      current: '',
      next: '',
    });

  // Update users info when data changes
  React.useEffect(() => {
    setUsersInfo([usersResponse.Users, isMutating, error]);
  }, [usersResponse, isMutating, error, setUsersInfo]);

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
    continuationTokensRefresher(setContinuationTokens, trigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNextClick = async () => {
    if (continuationTokens.next && loadedWOError) {
      fetchIAMUsers(
        setContinuationTokens,
        trigger,
        true,
        continuationTokens.next
      );
    }
  };

  const onPreviousClick = async () => {
    if (continuationTokens.current && loadedWOError) {
      const marker =
        continuationTokens.previous[continuationTokens.previous.length - 1];
      fetchIAMUsers(setContinuationTokens, trigger, false, marker);
    }
  };

  const [paginationToCount, paginationFromCount] = getPaginationCount(
    continuationTokens,
    usersResponse.Users.length || 0,
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
  setUsersInfo: React.Dispatch<[User[], boolean, any]>;
};
