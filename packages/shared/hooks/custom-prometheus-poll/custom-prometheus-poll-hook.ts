import {
  DEFAULT_PROMETHEUS_SAMPLES,
  DEFAULT_PROMETHEUS_TIMESPAN,
  PrometheusEndpoint,
} from '@odf/shared/constants';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { getPrometheusURL } from './helpers';
import { useURLPoll } from './use-url-poll';

type CustomPrometheusPollProps = {
  delay?: number;
  endpoint: PrometheusEndpoint;
  endTime?: number;
  namespace?: string;
  query: string;
  samples?: number;
  timeout?: string;
  timespan?: number;
  basePath?: string;
};

type UseCustomPrometheusPoll = (
  props: CustomPrometheusPollProps
) => [PrometheusResponse, any, boolean];

export const useCustomPrometheusPoll: UseCustomPrometheusPoll = ({
  delay,
  endpoint,
  endTime,
  namespace,
  query,
  samples = DEFAULT_PROMETHEUS_SAMPLES,
  timeout,
  timespan = DEFAULT_PROMETHEUS_TIMESPAN,
  basePath,
}) => {
  const url = !!basePath
    ? getPrometheusURL(
        { endpoint, endTime, namespace, query, samples, timeout, timespan },
        basePath
      )
    : getPrometheusURL({
        endpoint,
        endTime,
        namespace,
        query,
        samples,
        timeout,
        timespan,
      });

  return useURLPoll<PrometheusResponse>(url, delay, query, timespan);
};
