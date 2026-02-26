import * as React from 'react';
import { ListVectorBucketsCommandOutput } from '@aws-sdk/client-s3vectors';
import {
  LIST_VECTOR_BUCKET,
  MAX_VECTOR_BUCKETS,
} from '@odf/core/constants/s3-vectors';
import { VectorBucketCrFormat } from '@odf/core/types/s3-vectors';
import { convertVectorBucketDataToCrFormat } from '@odf/core/utils/s3-vectors';
import useSWRMutation from 'swr/mutation';
import {
  ContinuationTokens,
  continuationTokensRefresher,
  fetchS3Resources,
  getPaginationCount,
  Pagination,
} from '../../s3-browser/pagination-helper';
import { S3VectorsContext } from '../s3-vectors-context';

export const VectorBucketsPagination: React.FC<VectorBucketPaginationProps> = ({
  setVectorBucketInfo,
}) => {
  const { s3VectorsClient } = React.useContext(S3VectorsContext);
  const fetchVectorBucketsList = React.useCallback(
    (_url: string, { arg }: { arg: string }) =>
      s3VectorsClient.listVectorBuckets({
        maxResults: MAX_VECTOR_BUCKETS,
        ...(!!arg && { nextToken: arg }),
      }),
    [s3VectorsClient]
  );

  const { data, isMutating, trigger, error } = useSWRMutation(
    LIST_VECTOR_BUCKET,
    fetchVectorBucketsList
  );

  const loadedWithoutError = !isMutating && !error;
  const [continuationTokens, setContinuationTokens] =
    React.useState<ContinuationTokens>({
      previous: [],
      current: '',
      next: '',
    });

  React.useEffect(() => {
    setVectorBucketInfo([
      convertVectorBucketDataToCrFormat(data),
      !isMutating,
      error,
    ]);
  }, [data, error, isMutating, setVectorBucketInfo]);

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
    if (!!continuationTokens.next && loadedWithoutError)
      fetchS3Resources<ListVectorBucketsCommandOutput>(
        setContinuationTokens,
        trigger,
        true,
        continuationTokens.next,
        undefined,
        false
      );
  };

  const onPreviousClick = async () => {
    if (!!continuationTokens.current && loadedWithoutError) {
      const nextToken =
        continuationTokens.previous[continuationTokens.previous.length - 1];
      fetchS3Resources<ListVectorBucketsCommandOutput>(
        setContinuationTokens,
        trigger,
        false,
        nextToken,
        undefined,
        false
      );
    }
  };

  const [paginationToCount, paginationFromCount] = getPaginationCount(
    continuationTokens,
    data?.vectorBuckets?.length || 0,
    MAX_VECTOR_BUCKETS
  );

  return (
    <Pagination
      disableNext={!continuationTokens.next || !loadedWithoutError}
      disablePrevious={!continuationTokens.previous || !loadedWithoutError}
      onNext={onNextClick}
      onPrevious={onPreviousClick}
      fromCount={paginationFromCount}
      toCount={paginationToCount}
    />
  );
};

type VectorBucketPaginationProps = {
  setVectorBucketInfo: React.Dispatch<
    React.SetStateAction<[VectorBucketCrFormat[], boolean, any]>
  >;
};
