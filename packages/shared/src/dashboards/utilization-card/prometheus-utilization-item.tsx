import * as React from 'react';
import { UtilizationItem } from '@odf/shared/dashboards/utilization-card/utilization-item';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import {
  Humanize,
  PrometheusResponse,
} from '@openshift-console/dynamic-plugin-sdk';
import { useUtilizationDuration } from '@openshift-console/dynamic-plugin-sdk-internal';
import {
  ByteDataTypes,
  UtilizationItemProps,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import * as _ from 'lodash-es';

enum LIMIT_STATE {
  ERROR = 'ERROR',
  WARN = 'WARN',
  OK = 'OK',
}

const getMax = (result: PrometheusResponse['data']['result']): number => {
  const resourceValues = _.flatMap(result, (resource) => resource.values);
  const maxValue = _.maxBy(resourceValues, (value) => Number(value[1]));
  return maxValue ? Number(maxValue[1]) : NaN;
};

export const PrometheusUtilizationItem: React.FC<PrometheusUtilizationItemProps> =
  ({
    utilizationQuery,
    totalQuery,
    title,
    humanizeValue,
    byteDataType,
    TopConsumerPopover,
    setLimitReqState,
    basePath,
  }) => {
    const { duration } = useUtilizationDuration();
    const defaultBasePath = usePrometheusBasePath();

    const [utilization, error, loading] = useCustomPrometheusPoll({
      query: utilizationQuery,
      endpoint: 'api/v1/query_range' as any,
      timespan: duration,
      basePath: basePath || defaultBasePath,
    });

    if (totalQuery) {
      return (
        <TotalUtilizationItem
          TopConsumerPopover={TopConsumerPopover}
          byteDataType={byteDataType}
          error={error}
          humanizeValue={humanizeValue}
          isLoading={loading}
          query={[utilizationQuery]}
          setLimitReqState={setLimitReqState}
          title={title}
          utilization={utilization}
          basePath={basePath}
          defaultBasePath={defaultBasePath}
          duration={duration}
          totalQuery={totalQuery}
        />
      );
    }

    return (
      <UtilizationItem
        TopConsumerPopover={TopConsumerPopover}
        byteDataType={byteDataType}
        error={error}
        humanizeValue={humanizeValue}
        isLoading={loading}
        query={[utilizationQuery]}
        setLimitReqState={setLimitReqState}
        title={title}
        utilization={utilization}
      />
    );
  };

type TotalUtilizationItemProps = UtilizationItemProps & {
  basePath: string;
  defaultBasePath: string;
  duration: number;
  totalQuery: string;
};

const TotalUtilizationItem: React.FC<TotalUtilizationItemProps> = (props) => {
  const [total, totalError, totalLoading] = useCustomPrometheusPoll({
    query: props.totalQuery,
    endpoint: 'api/v1/query_range' as any,
    timespan: props.duration,
    basePath: props.basePath || props.defaultBasePath,
  });

  let max: number = null;
  if (total && _.isEmpty(totalError) && !totalLoading) {
    max = getMax(total.data.result);
  }

  return (
    <UtilizationItem
      TopConsumerPopover={props.TopConsumerPopover}
      byteDataType={props.byteDataType}
      error={props.error || totalError}
      humanizeValue={props.humanizeValue}
      isLoading={props.isLoading || totalLoading}
      query={props.query}
      setLimitReqState={props.setLimitReqState}
      title={props.title}
      utilization={props.utilization}
      max={max}
    />
  );
};

type TopConsumerPopoverProp = {
  current: string;
  max?: string;
  limit?: string;
  available?: string;
  requested?: string;
  total?: string;
  limitState?: LIMIT_STATE;
  requestedState?: LIMIT_STATE;
};

type PrometheusCommonProps = {
  title: string;
  humanizeValue: Humanize;
  byteDataType?: ByteDataTypes;
  namespace?: string;
  isDisabled?: boolean;
};

type LimitRequested = {
  limit: LIMIT_STATE;
  requested: LIMIT_STATE;
};

type PrometheusUtilizationItemProps = PrometheusCommonProps & {
  utilizationQuery: string;
  totalQuery?: string;
  limitQuery?: string;
  requestQuery?: string;
  TopConsumerPopover?: React.ComponentType<TopConsumerPopoverProp>;
  setLimitReqState?: (state: LimitRequested) => void;
  basePath?: string;
};
