import * as React from 'react';
import { UtilizationItem } from '@odf/shared/dashboards/utilization-card/utilization-item';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { Humanize } from '@openshift-console/dynamic-plugin-sdk';
import { useUtilizationDuration } from '@openshift-console/dynamic-plugin-sdk-internal';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';

enum LIMIT_STATE {
  ERROR = 'ERROR',
  WARN = 'WARN',
  OK = 'OK',
}

export const PrometheusUtilizationItem: React.FC<PrometheusUtilizationItemProps> =
  ({
    utilizationQuery,
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
      delay: duration,
      basePath: basePath || defaultBasePath,
    });

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
