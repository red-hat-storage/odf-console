import * as React from 'react';
import { ListCommandOutput } from '@odf/shared/s3';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { TriggerWithOptionsArgs } from 'swr/dist/mutation';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { AngleLeftIcon, AngleRightIcon } from '@patternfly/react-icons';

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
};

type Trigger<T> = TriggerWithOptionsArgs<T, any, string, string>;

const getNextContinuationToken = (response: ListCommandOutput) =>
  'NextContinuationToken' in response
    ? response.NextContinuationToken
    : response.ContinuationToken;

export const continuationTokensSetter = <T extends ListCommandOutput>(
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<ContinuationTokens>
  >,
  response: T,
  isNext: boolean,
  setSelectedRows?: React.Dispatch<React.SetStateAction<K8sResourceCommon[]>>
) => {
  setContinuationTokens((oldTokens) => {
    const newTokens = _.cloneDeep(oldTokens);
    if (isNext) {
      newTokens.previous.push(newTokens.current);
      newTokens.current = newTokens.next;
    } else {
      newTokens.current = newTokens.previous.pop();
    }

    newTokens.next = getNextContinuationToken(response);

    return newTokens;
  });
  !!setSelectedRows && setSelectedRows([]);
};

export const fetchS3Resources = async <T extends ListCommandOutput>(
  setContinuationTokens: React.Dispatch<
    React.SetStateAction<ContinuationTokens>
  >,
  trigger: Trigger<T>,
  isNext: boolean,
  paginationToken = '',
  setSelectedRows?: React.Dispatch<React.SetStateAction<K8sResourceCommon[]>>
) => {
  try {
    const response: T = await trigger(paginationToken);
    continuationTokensSetter(
      setContinuationTokens,
      response,
      isNext,
      setSelectedRows
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
    React.SetStateAction<ContinuationTokens>
  >,
  trigger: Trigger<T>,
  setSelectedRows?: React.Dispatch<React.SetStateAction<K8sResourceCommon[]>>
) => {
  try {
    const response: T = await trigger();
    setContinuationTokens({
      previous: [''],
      current: '',
      next: getNextContinuationToken(response),
    });
    !!setSelectedRows && setSelectedRows([]);
  } catch (err) {
    // no need to handle any error here, use "error" object directly from the "useSWRMutation" hook
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

export const Pagination: React.FC<PaginationProps> = ({
  onNext,
  onPrevious,
  disableNext,
  disablePrevious,
}) => {
  return (
    <div className="pf-v5-u-display-flex pf-v5-u-flex-direction-row">
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
