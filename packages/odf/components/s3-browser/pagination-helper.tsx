import * as React from 'react';
import {
  ListObjectsV2CommandOutput,
  ListBucketsCommandOutput,
  ListObjectVersionsCommandOutput,
} from '@aws-sdk/client-s3';
import { ListCommandOutput } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { TriggerWithOptionsArgs } from 'swr/dist/mutation';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon } from '@patternfly/react-icons';

export type VersionToken = { keyMarker: string; versionIdMarker: string };

export type ContinuationVersionsTokens = {
  previous: VersionToken[];
  current: VersionToken;
  next: VersionToken;
};

export type ContinuationTokens = {
  previous: string[];
  current: string;
  next: string;
};

export type PaginationProps = {
  onNext: () => void;
  onPrevious: () => void;
  disableNext: boolean;
  disablePrevious: boolean;
  fromCount: number;
  toCount: number;
};

type Trigger<T> = TriggerWithOptionsArgs<T, any, string, string | VersionToken>;

const getNextMarkers = (
  response: ListObjectVersionsCommandOutput
): VersionToken =>
  response?.IsTruncated
    ? {
        keyMarker: response?.NextKeyMarker,
        versionIdMarker: response?.NextVersionIdMarker,
      }
    : null;

const getNextContinuationToken = (
  response: ListCommandOutput,
  containsNextContinuation = true
): string =>
  containsNextContinuation
    ? (response as ListObjectsV2CommandOutput).NextContinuationToken
    : (response as ListBucketsCommandOutput).ContinuationToken;

const continuationTokensSetter = <T extends ListCommandOutput>(
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<ContinuationTokens | ContinuationVersionsTokens>
  >,
  response: T,
  isNext: boolean,
  setSelectedRows?: React.Dispatch<React.SetStateAction<K8sResourceCommon[]>>,
  containsNextContinuation?: boolean,
  containsMarkers?: boolean
) => {
  setContinuationTokens((oldTokens) => {
    const newTokens = _.cloneDeep(oldTokens);
    if (isNext) {
      newTokens.previous.push(newTokens.current as any);
      newTokens.current = newTokens.next;
    } else {
      newTokens.current = newTokens.previous.pop();
    }

    newTokens.next = containsMarkers
      ? getNextMarkers(response)
      : getNextContinuationToken(response, containsNextContinuation);

    return newTokens;
  });
  !!setSelectedRows && setSelectedRows([]);
};

export const fetchS3Resources = async <T extends ListCommandOutput>(
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<ContinuationTokens | ContinuationVersionsTokens>
  >,
  trigger: Trigger<T>,
  isNext: boolean,
  paginationToken: string | VersionToken,
  setSelectedRows?: React.Dispatch<React.SetStateAction<K8sResourceCommon[]>>,
  containsNextContinuation?: boolean,
  containsMarkers = false
) => {
  try {
    const response: T = await trigger(paginationToken);
    continuationTokensSetter<T>(
      setContinuationTokens,
      response,
      isNext,
      setSelectedRows,
      containsNextContinuation,
      containsMarkers
    );
  } catch (err) {
    // no need to handle any error here, use "error" object directly from the "useSWRMutation" hook
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

// for refreshing (re-feching) s3 resources from start, once state has changed by adding/deleted
export const continuationTokensRefresher = async <T extends ListCommandOutput>(
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<ContinuationTokens | ContinuationVersionsTokens>
  >,
  trigger: Trigger<T>,
  setSelectedRows?: React.Dispatch<React.SetStateAction<K8sResourceCommon[]>>,
  containsNextContinuation?: boolean,
  containsMarkers = false
) => {
  try {
    const response: T = await trigger();
    containsMarkers
      ? setContinuationTokens({
          previous: [null],
          current: null,
          next: getNextMarkers(response),
        } as ContinuationVersionsTokens)
      : setContinuationTokens({
          previous: [''],
          current: '',
          next: getNextContinuationToken(response, containsNextContinuation),
        } as ContinuationTokens);
    !!setSelectedRows && setSelectedRows([]);
  } catch (err) {
    // no need to handle any error here, use "error" object directly from the "useSWRMutation" hook
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

const getFromCount = (
  continuationTokens: ContinuationTokens | ContinuationVersionsTokens,
  currentPageCount: number,
  maxResponses: number
): number => {
  if (currentPageCount === 0) return 0;
  const prevLen = continuationTokens.previous?.length || 0;
  return prevLen === 0 ? prevLen : (prevLen - 1) * maxResponses + 1;
};

const getToCount = (fromCount: number, currentPageCount: number): number => {
  const count = fromCount - 1 + currentPageCount;
  return count <= 0 ? 0 : count;
};

export const getPaginationCount = (
  continuationTokens: ContinuationTokens | ContinuationVersionsTokens,
  currentPageCount: number,
  maxResponses: number
) => {
  const fromCount = getFromCount(
    continuationTokens,
    currentPageCount,
    maxResponses
  );
  const toCount = getToCount(fromCount, currentPageCount);
  return [toCount, fromCount];
};

export const Pagination: React.FC<PaginationProps> = ({
  onNext,
  onPrevious,
  disableNext,
  disablePrevious,
  fromCount,
  toCount,
}) => {
  const { t } = useCustomTranslation();

  const totalCount = disableNext ? toCount : t('many');
  return (
    <div className="pf-v6-u-display-flex pf-v6-u-flex-direction-row">
      <b className="pf-v6-u-mt-xs">
        {t('{{ fromCount }} - {{ toCount }} of {{ totalCount }}', {
          fromCount,
          toCount,
          totalCount,
        })}
      </b>
      <Button
        icon={<AngleLeftIcon />}
        variant={ButtonVariant.plain}
        className="pf-v6-u-mr-xs"
        isDisabled={disablePrevious}
        onClick={onPrevious}
      />
      <Button
        icon={<AngleRightIcon />}
        variant={ButtonVariant.plain}
        className="pf-v6-u-ml-xs"
        isDisabled={disableNext}
        onClick={onNext}
      />
    </div>
  );
};
