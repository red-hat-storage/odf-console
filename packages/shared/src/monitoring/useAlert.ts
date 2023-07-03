import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import {
  Alert,
  PrometheusEndpoint,
  PrometheusRule,
  Rule,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { murmur3 } from 'murmurhash-js';

type Group = {
  rules: PrometheusRule[];
  file: string;
  name: string;
};

type PrometheusRulesResponse = {
  data: {
    groups: Group[];
  };
  status: string;
};

const useAlerts = (basePath = '', cluster = ''): [Alert[], boolean, any] => {
  const defaultBasePath = usePrometheusBasePath();

  const [data, error, loading] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.RULES as any,
    query: PrometheusEndpoint.RULES,
    basePath: basePath || defaultBasePath,
    ...(!!cluster ? { cluster } : {}),
  });

  // Flatten the rules data to make it easier to work with, discard non-alerting rules since those
  // are the only ones we will be using and add a unique ID to each rule.
  const groups = (data as unknown as PrometheusRulesResponse)?.data?.groups;
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
  return [alerts, !loading, error];
};

export default useAlerts;
