import * as React from 'react';
import { ListUsersCommandOutput } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import { TriggerWithOptionsArgs } from 'swr/dist/mutation';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon } from '@patternfly/react-icons';

export type IAMContinuationTokens = {
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

type Trigger<T> = TriggerWithOptionsArgs<T, any, string, string>;

/**
 * Extracts the next marker from IAM API response
 * IAM uses 'Marker' and 'IsTruncated' fields
 */
const getNextMarker = (response: ListUsersCommandOutput): string =>
  response?.IsTruncated ? response?.Marker || null : null;

/**
 * Updates continuation tokens based on navigation direction
 */
const continuationTokensSetter = <T extends ListUsersCommandOutput>(
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<IAMContinuationTokens>
  >,
  response: T,
  isNext: boolean
) => {
  setContinuationTokens((oldTokens) => {
    const newTokens = _.cloneDeep(oldTokens);
    if (isNext) {
      newTokens.previous.push(newTokens.current as any);
      newTokens.current = newTokens.next;
    } else {
      newTokens.current = newTokens.previous.pop();
    }
    newTokens.next = getNextMarker(response);

    return newTokens;
  });
};

export const fetchIAMUsers = async <T extends ListUsersCommandOutput>(
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<IAMContinuationTokens>
  >,
  trigger: Trigger<T>,
  isNext: boolean,
  marker: string
) => {
  try {
    const response: T = await trigger(marker);
    continuationTokensSetter<T>(setContinuationTokens, response, isNext);
  } catch (err) {
    // no need to handle any error here, use "error" object directly from the "useSWRMutation" hook
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

// for refreshing (re-feching) IAM Users from start, once state has changed by adding/deleted
export const continuationTokensRefresher = async <
  T extends ListUsersCommandOutput,
>(
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<IAMContinuationTokens>
  >,
  trigger: Trigger<T>
) => {
  try {
    const response: T = await trigger();
    setContinuationTokens({
      previous: [null],
      current: null,
      next: getNextMarker(response),
    });
  } catch (err) {
    // no need to handle any error here, use "error" object directly from the "useSWRMutation" hook
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

const getFromCount = (
  continuationTokens: IAMContinuationTokens,
  currentPageCount: number,
  maxResponses: number
): number => {
  if (currentPageCount === 0) return 0;
  const prevLen = continuationTokens.previous?.length || 0;
  return prevLen === 0 ? 1 : prevLen * maxResponses + 1;
};

const getToCount = (fromCount: number, currentPageCount: number): number => {
  const count = fromCount - 1 + currentPageCount;
  return count <= 0 ? 0 : count;
};

export const getPaginationCount = (
  continuationTokens: IAMContinuationTokens,
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
    <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-row">
      <b className="pf-v5-u-mt-xs">
        {t('{{ fromCount }} - {{ toCount }} of {{ totalCount }}', {
          fromCount,
          toCount,
          totalCount,
        })}
      </b>
      <Button
        variant={ButtonVariant.plain}
        className="pf-v5-u-mr-xs"
        isDisabled={disablePrevious}
        onClick={onPrevious}
      >
        <AngleLeftIcon />
      </Button>
      <Button
        variant={ButtonVariant.plain}
        className="pf-v5-u-ml-xs"
        isDisabled={disableNext}
        onClick={onNext}
      >
        <AngleRightIcon />
      </Button>
    </div>
  );
};
