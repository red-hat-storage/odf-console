import { Alert, PrometheusLabels } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { MonitoringResource } from './types';

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
