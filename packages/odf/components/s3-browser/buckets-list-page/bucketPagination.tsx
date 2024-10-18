import * as React from 'react';
import { ListBucketsCommandOutput } from '@aws-sdk/client-s3';
import { LIST_BUCKET, MAX_BUCKETS } from '@odf/core/constants';
import { BucketCrFormat } from '@odf/core/types';
import { convertBucketDataToCrFormat } from '@odf/core/utils';
import useSWRMutation from 'swr/mutation';
import { NoobaaS3Context } from '../noobaa-context';
import {
  ContinuationTokens,
  continuationTokensRefresher,
  fetchS3Resources,
  getPaginationCount,
  Pagination,
} from '../pagination-helper';

export const BucketPagination: React.FC<BucketPaginationProps> = ({
  setBucketInfo,
}) => {
  const { noobaaS3 } = React.useContext(NoobaaS3Context);
  const { data, error, isMutating, trigger } = useSWRMutation(
    LIST_BUCKET,
    (_url, { arg }: { arg: string }) =>
      noobaaS3.listBuckets({
        MaxBuckets: MAX_BUCKETS,
        ...(!!arg && { ContinuationToken: arg }),
      })
  );

  const loadedWOError = !isMutating && !error;
  const [continuationTokens, setContinuationTokens] =
    React.useState<ContinuationTokens>({
      previous: [],
      current: '',
      next: '',
    });

  React.useEffect(() => {
    setBucketInfo([convertBucketDataToCrFormat(data), !isMutating, error]);
  }, [data, isMutating, error, setBucketInfo]);

  // initial fetch on first mount
  React.useEffect(() => {
    continuationTokensRefresher(
      setContinuationTokens,
      trigger,
      undefined,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNextClick = async () => {
    if (!!continuationTokens.next && loadedWOError)
      fetchS3Resources<ListBucketsCommandOutput>(
        setContinuationTokens,
        trigger,
        true,
        continuationTokens.next,
        undefined,
        false
      );
  };

  const onPreviousClick = async () => {
    if (!!continuationTokens.current && loadedWOError) {
      const paginationToken =
        continuationTokens.previous[continuationTokens.previous.length - 1];
      fetchS3Resources<ListBucketsCommandOutput>(
        setContinuationTokens,
        trigger,
        false,
        paginationToken,
        undefined,
        false
      );
    }
  };

  const [paginationToCount, paginationFromCount] = getPaginationCount(
    continuationTokens,
    data?.Buckets?.length || 0,
    MAX_BUCKETS
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

type BucketPaginationProps = {
  setBucketInfo: React.Dispatch<
    React.SetStateAction<[BucketCrFormat[], boolean, any]>
  >;
};
