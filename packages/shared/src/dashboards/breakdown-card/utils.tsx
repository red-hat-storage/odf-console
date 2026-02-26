import { DataPoint } from '@odf/shared/utils';
import { Humanize } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { t_global_color_nonstatus_gray_400 as globalBlack400 } from '@patternfly/react-tokens';
import { Colors } from './consts';

const getTotal = (stats: StackDataPoint[]) =>
  stats.reduce((total, dataPoint) => total + dataPoint.y, 0);

const addOthers = (
  stats: StackDataPoint[],
  metricTotal: string,
  humanize: Humanize,
  t: TFunction
): StackDataPoint => {
  const top5Total = getTotal(stats);
  const others = Number(metricTotal) - top5Total;
  const othersData = {
    x: '0',
    y: others,
    name: t('Other'),
    color: Colors.OTHER,
    label: humanize(others).string,
    fill: 'rgb(96, 98, 103)',
    link: t(
      'All other capacity usage that are not a part of the top 5 consumers.'
    ),
    id: 6,
    ns: '',
  };
  return othersData;
};

export const addAvailable = (
  stats: StackDataPoint[],
  capacityAvailable: string,
  metricTotal: string,
  humanize: Humanize,
  t: TFunction
) => {
  let othersData: StackDataPoint;
  let availableData: StackDataPoint;
  let newChartData: StackDataPoint[] = [...stats];
  if (stats.length > 5) {
    othersData = addOthers(stats, metricTotal, humanize, t);
    newChartData = [...stats, othersData] as StackDataPoint[];
  }
  if (capacityAvailable) {
    const availableInBytes = Number(capacityAvailable);
    availableData = {
      x: '0',
      y: availableInBytes,
      name: t('Available'),
      link: '',
      color: '',
      label: humanize(availableInBytes).string,
      fill: globalBlack400.value,
      id: 7,
      ns: '',
    };
    newChartData = [...newChartData, availableData] as StackDataPoint[];
  }
  return newChartData;
};

export const getLegends = (data: StackDataPoint[]) =>
  data.map((d: StackDataPoint) => ({
    name: `${d.name}\n${d.label}`,
    labels: { fill: d.color },
    symbol: { fill: d.fill },
    link: d.link,
    labelId: d.name,
    ns: d.ns,
  }));

export const getBarRadius = (index: number, length: number) => {
  if (index === length - 1) {
    return {
      bottom: 3,
      top: 3,
    };
  }
  if (index === 0) {
    return { bottom: 3 };
  }
  return {};
};

export type StackDataPoint = DataPoint<string> & {
  name: string;
  link: string;
  color: string;
  fill: string;
  id: number;
  ns: string;
};

export const getCapacityValue = (
  cephUsed: string,
  cephTotal: string,
  humanize: Humanize
) => {
  const totalFormatted = humanize(cephTotal || 0);
  const usedFormatted = humanize(cephUsed || 0, null, totalFormatted.unit);
  const available = humanize(
    totalFormatted.value - usedFormatted.value,
    totalFormatted.unit,
    totalFormatted.unit
  );
  return available;
};
