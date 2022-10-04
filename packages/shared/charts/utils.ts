import {
  PrometheusResponse,
  PrometheusResult,
} from '@openshift-console/dynamic-plugin-sdk';
import { chart_color_orange_300 as requestedColor } from '@patternfly/react-tokens/dist/js/chart_color_orange_300';
import * as _ from 'lodash-es';
import { DataPoint, getType } from '../utils';

const log = (x: number, y: number) => {
  return Math.log(y) / Math.log(x);
};

// Get the larget unit seen in the dataframe within the supported range
const bestUnit = (dataPoints: DataPoint[][], type) => {
  const flattenDataPoints = dataPoints.reduce(
    (acc, arr) => acc.concat(arr),
    []
  );

  const bestLevel = flattenDataPoints.reduce((maxUnit, point) => {
    const index = Math.floor(log(_.get(type, 'divisor', 1024), point.y));
    const unitIndex =
      index >= type.units.length ? type.units.length - 1 : index;
    return maxUnit < unitIndex ? unitIndex : maxUnit;
  }, -1);
  return _.get(type, ['units', bestLevel]);
};

export const processFrame = (
  dataPoints: DataPoint[][],
  typeName: string
): ProcessFrameResult => {
  const type = getType(typeName);
  let unit = null;
  if (dataPoints && dataPoints[0]) {
    // Get the appropriate unit and convert the dataset to that level
    unit = bestUnit(dataPoints, type);
    const frameLevel = type.units.indexOf(unit);
    dataPoints.forEach((arr) =>
      arr.forEach((point) => {
        point.y /= type.divisor ** frameLevel;
      })
    );
  }
  return { processedData: dataPoints, unit };
};

export type ProcessFrameResult = {
  processedData: DataPoint[][];
  unit: string;
};

type XMutator = (x: any) => Date;
type YMutator = (y: any) => number;

export const defaultXMutator: XMutator = (x) => new Date(x * 1000);
export const defaultYMutator: YMutator = (y) => parseFloat(y);

export type GetRangeStats = (
  response: PrometheusResponse,
  description?: string | ((result: PrometheusResult, index: number) => string),
  symbol?: { fill?: string; type?: string },
  xMutator?: XMutator,
  yMutator?: YMutator,
  optionalParser?: (datum: PrometheusResponse) => PrometheusResult[]
) => DataPoint<Date>[][];

export const getRangeVectorStats: GetRangeStats = (
  response,
  description,
  symbol,
  xMutator,
  yMutator,
  optionalParser
) => {
  const results = !optionalParser
    ? response?.data?.result
    : optionalParser(response);
  return results?.map((r, index) => {
    return r?.values?.map(([x, y]) => {
      return {
        x: xMutator?.(x) ?? defaultXMutator(x),
        y: yMutator?.(y) ?? defaultYMutator(y),
        description: _.isFunction(description)
          ? description(r, index)
          : description,
        symbol,
      } as DataPoint<Date>;
    });
  });
};

export const mapLimitsRequests = (
  utilization: PrometheusResponse,
  limit: PrometheusResponse,
  requested: PrometheusResponse,
  xMutator?: XMutator,
  t?: any
): { data: DataPoint[][]; chartStyle: object[] } => {
  const utilizationData = getRangeVectorStats(
    utilization,
    'usage',
    null,
    xMutator
  );
  const data = utilizationData ? [...utilizationData] : [];
  const chartStyle = [null];
  if (limit) {
    const limitData = getRangeVectorStats(
      limit,
      t('total limit'),
      { type: 'dash' },
      xMutator
    );
    data.push(...limitData);
    if (limitData.length) {
      chartStyle.push({
        data: { strokeDasharray: '3,3', fillOpacity: 0 },
      });
    }
  }
  if (requested) {
    const reqData = getRangeVectorStats(
      requested,
      t('total requested'),
      {
        type: 'dash',
        fill: requestedColor.value,
      },
      xMutator
    );
    data.push(...reqData);
    if (reqData.length) {
      chartStyle.push({
        data: {
          stroke: requestedColor.value,
          strokeDasharray: '3,3',
          fillOpacity: 0,
        },
      });
    }
  }

  return { data, chartStyle };
};
