import { Colors, COLORMAP } from '@odf/shared/dashboards/breakdown-card/consts';
import { DataPoint } from '@odf/shared/utils';
import { Humanize } from '@openshift-console/dynamic-plugin-sdk';

export const getStackChartStats: GetStackStats = (
  response,
  humanize,
  labelNames
) =>
  response.map((r, i) => {
    const capacity = humanize(r.y).string;
    const fullName = labelNames ? labelNames[i] : `${r.x}`;
    return {
      // x value needs to be same for single bar stack chart
      x: '0',
      y: r.y,
      name: fullName,
      link: fullName,
      color: labelNames ? Colors.OTHER : Colors.LINK,
      fill: COLORMAP[i],
      label: capacity,
      id: i,
      ns: r.metric.namespace,
    };
  });

type GetStackStats = (
  response: DataPoint[],
  humanize: Humanize,
  labelNames?: string[]
) => StackDataPoint[];

export type StackDataPoint = DataPoint<string> & {
  name: string;
  link: string;
  color: string;
  fill: string;
  id: number;
  ns: string;
};
