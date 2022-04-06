import {
  Humanize,
  PrometheusResponse,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';

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
