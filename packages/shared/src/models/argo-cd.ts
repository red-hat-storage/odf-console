import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const ArgoApplicationSetModel: K8sModel = {
  label: 'ApplicationSet',
  labelPlural: 'ApplicationSets',
  apiVersion: 'v1alpha1',
  apiGroup: 'argoproj.io',
  plural: 'applicationsets',
  abbr: 'AS',
  namespaced: true,
  kind: 'ApplicationSet',
  crd: true,
};
