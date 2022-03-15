import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const DRPolicyModel: K8sModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'ramendr.openshift.io',
  kind: 'DRPolicy',
  plural: 'drpolicies',
  label: 'DR Policy',
  labelPlural: 'DR Policies',
  crd: true,
  abbr: 'DRP',
  namespaced: false,
};
