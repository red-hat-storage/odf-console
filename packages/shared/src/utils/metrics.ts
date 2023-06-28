import {
  Humanize,
  PrometheusResponse,
} from '@openshift-console/dynamic-plugin-sdk';
import { Alert, PrometheusLabels } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

export const getGaugeValue = (response: PrometheusResponse) =>
  response?.data?.result?.[0]?.value?.[1];

export const getResiliencyProgress = (results: PrometheusResponse): number => {
  /**
   * Possible values for progress:
   *   - A float value of String type
   *   - 'NaN'
   *   - undefined
   */
  const progress: string = getGaugeValue(results);
  return parseFloat(progress);
};

export type DataPoint<X = Date | number | string> = {
  x?: X;
  y?: number;
  label?: string;
  metric?: { [key: string]: string };
  description?: string;
  symbol?: {
    type?: string;
    fill?: string;
  };
};

export type GetInstantStats = (
  response: PrometheusResponse,
  metric?: string,
  humanize?: Humanize
) => DataPoint<number>[];

export const getInstantVectorStats: GetInstantStats = (
  response,
  metric,
  humanize
) => {
  const results = _.get(response, 'data.result', []);
  return results.map((r) => {
    const y = parseFloat(_.get(r, 'value[1]'));
    return {
      label: humanize ? humanize(y).string : null,
      x: _.get(r, ['metric', metric], ''),
      y,
      metric: r.metric,
    };
  });
};

export const sortInstantVectorStats = (stats: DataPoint[]): DataPoint[] => {
  stats.sort((a, b) => {
    const y1 = a.y;
    const y2 = b.y;
    if (y1 === y2) {
      const x1 = a.x;
      const x2 = b.x;
      return x1 < x2 ? -1 : x1 > x2 ? 1 : 0;
    }
    return y2 - y1;
  });
  return stats.length === 6 ? stats.splice(0, 5) : stats;
};

export const getMetric = (result: PrometheusResponse, metric: string): string =>
  _.get(result, ['data', 'result', '0', 'metric', metric], null);

export type MonitoringResource = {
  abbr: string;
  kind: string;
  label: string;
  plural: string;
};

export const AlertResource: MonitoringResource = {
  kind: 'Alert',
  label: 'Alert',
  plural: '/monitoring/alerts',
  abbr: 'AL',
};

export const labelsToParams = (labels: PrometheusLabels) =>
  _.map(
    labels,
    (v, k) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
  ).join('&');

export const alertURL = (alert: Alert, ruleID: string) =>
  `${AlertResource.plural}/${ruleID}?${labelsToParams(alert.labels)}`;

export const getAlertSeverity = (alert: Alert) => alert?.labels?.severity;

export const defaultXMutator: XMutator = (x) => new Date(x * 1000);
export const defaultYMutator: YMutator = (y) => parseFloat(y);

type XMutator = (x: any) => Date;
type YMutator = (y: any) => number;
