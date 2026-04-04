import * as React from 'react';
import { ListIndexesCommandOutput } from '@aws-sdk/client-s3vectors';
import {
  LIST_VECTOR_INDEX,
  MAX_VECTOR_INDEXES,
} from '@odf/core/constants/s3-vectors';
import { K8ResourceCommon } from '@odf/core/types/s3-vectors';
import { convertVectorIndexesToCrFormat } from '@odf/core/utils/s3-vectors';
import useSWRMutation from 'swr/mutation';
import {
  ContinuationTokens,
  continuationTokensRefresher,
  fetchS3Resources,
  getPaginationCount,
  Pagination,
} from '../../s3-browser/pagination-helper';
import { S3VectorsContext } from '../s3-vectors-context';

export const VectorIndexesPagination: React.FC<
  VectorIndexesPaginationProps
> = ({ vectorBucketName, setVectorIndexInfo }) => {
  const { s3VectorsClient } = React.useContext(S3VectorsContext);
  const fetchVectorIndexesList = React.useCallback(
    (
      _key: string | [string, string],
      { arg }: { arg?: string }
    ): Promise<ListIndexesCommandOutput> =>
      s3VectorsClient.listIndexes({
        vectorBucketName,
        maxResults: MAX_VECTOR_INDEXES,
        ...(!!arg && { nextToken: arg }),
      }),
    [s3VectorsClient, vectorBucketName]
  );

  const { data, isMutating, trigger, error } = useSWRMutation(
    LIST_VECTOR_INDEX,
    fetchVectorIndexesList
  );

  const loadedWithoutError = !isMutating && !error;
  const [continuationTokens, setContinuationTokens] =
    React.useState<ContinuationTokens>({
      previous: [],
      current: '',
      next: '',
    });

  React.useEffect(() => {
    setVectorIndexInfo([
      convertVectorIndexesToCrFormat(data),
      !isMutating,
      error,
    ]);
  }, [data, error, isMutating, setVectorIndexInfo]);

  // initial fetch on first mount
  React.useEffect(() => {
    continuationTokensRefresher(
      setContinuationTokens,
      trigger,
      undefined,
      false, // containsNextContinuation - S3 Vectors uses nextToken instead of NextContinuationToken
      false,
      'nextToken'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNextClick = async () => {
    if (!!continuationTokens.next && loadedWithoutError)
      fetchS3Resources<ListIndexesCommandOutput>(
        setContinuationTokens,
        trigger,
        true,
        continuationTokens.next,
        undefined,
        false, // containsNextContinuation - S3 Vectors uses nextToken instead of NextContinuationToken
        false,
        'nextToken'
      );
  };
  const onPreviousClick = async () => {
    if (!!continuationTokens.current && loadedWithoutError) {
      const nextToken =
        continuationTokens.previous[continuationTokens.previous.length - 1];
      fetchS3Resources<ListIndexesCommandOutput>(
        setContinuationTokens,
        trigger,
        false,
        nextToken,
        undefined,
        false, // containsNextContinuation - S3 Vectors uses nextToken instead of NextContinuationToken
        false,
        'nextToken'
      );
    }
  };
  const [paginationToCount, paginationFromCount] = getPaginationCount(
    continuationTokens,
    data?.indexes?.length ?? 0,
    MAX_VECTOR_INDEXES
  );

  return (
    <Pagination
      disableNext={!continuationTokens.next || !loadedWithoutError}
      disablePrevious={!continuationTokens.current || !loadedWithoutError}
      onNext={onNextClick}
      onPrevious={onPreviousClick}
      fromCount={paginationFromCount}
      toCount={paginationToCount}
    />
  );
};

type VectorIndexesPaginationProps = {
  vectorBucketName: string;
  setVectorIndexInfo: React.Dispatch<
    React.SetStateAction<[K8ResourceCommon[], boolean, Error | undefined]>
  >;
};
