import { Colors, COLORMAP } from '@odf/shared/dashboards/breakdown-card/consts';
import { DataPoint } from '@odf/shared/utils';
import {
  Alert,
  Humanize,
  PrometheusRule,
  Rule,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import { murmur3 } from 'murmurhash-js';

export const getStackChartStats: GetStackStats = (
  response,
  humanize,
  labelNames
) =>
  response.map((r, i) => {
    const capacity = humanize(r.y).string;
    return {
      // x value needs to be same for single bar stack chart
      x: '0',
      y: r.y,
      name: labelNames ? labelNames[i] : _.truncate(`${r.x}`, { length: 12 }),
      link: labelNames ? labelNames[i] : `${r.x}`,
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

export const filterCephAlerts = (alerts: Alert[]): Alert[] => {
  const rookRegex = /.*rook.*/;
  return alerts
    ? alerts?.filter(
        (alert) =>
          alert?.annotations?.storage_type === 'ceph' ||
          Object.values(alert?.labels)?.some((item) => rookRegex.test(item))
      )
    : [];
};

export const filterNooBaaAlerts = (alerts: Alert[]): Alert[] =>
  alerts?.filter(
    (alert) => _.get(alert, 'annotations.storage_type') === 'NooBaa'
  );

export const filterRGWAlerts = (alerts: Alert[]): Alert[] =>
  alerts?.filter((alert) => alert?.annotations?.storage_type === 'RGW');

type Group = {
  rules: PrometheusRule[];
  file: string;
  name: string;
};

export type PrometheusRulesResponse = {
  data: {
    groups: Group[];
  };
  status: string;
};

export const getAlertsAndRules = (
  data: PrometheusRulesResponse
): { alerts: Alert[]; rules: Rule[] } => {
  // Flatten the rules data to make it easier to work with, discard non-alerting rules since those
  // are the only ones we will be using and add a unique ID to each rule.
  const groups = data?.data?.groups;
  const rules = _.flatMap(groups, (g) => {
    const addID = (r: PrometheusRule): Rule => {
      const key = [
        g.file,
        g.name,
        r.name,
        r.duration,
        r.query,
        ..._.map(r.labels, (k, v) => `${k}=${v}`),
      ].join(',');
      return { ...r, id: String(murmur3(key, 'monitoring-salt')) };
    };

    return _.filter(g.rules, { type: 'alerting' }).map(addID);
  });

  // Add `rule` object to each alert
  const alerts = _.flatMap(rules, (rule) =>
    rule.alerts.map((a) => ({ rule, ...a }))
  );

  return { alerts, rules };
};
