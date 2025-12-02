import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const PrometheusRuleModel: K8sKind = {
  label: 'PrometheusRule',
  labelKey: 'PrometheusRule',
  apiGroup: 'monitoring.coreos.com',
  apiVersion: 'v1',
  plural: 'prometheusrules',
  abbr: 'PR',
  namespaced: true,
  kind: 'PrometheusRule',
  id: 'prometheusrule',
  labelPlural: 'PrometheusRules',
  labelPluralKey: 'PrometheusRules',
};
