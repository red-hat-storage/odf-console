import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const SubmarinerModel: K8sModel = {
  label: 'Submariner',
  labelPlural: 'Submariners',
  apiVersion: 'v1alpha1',
  apiGroup: 'submariner.io',
  plural: 'submariners',
  abbr: 'SUB',
  namespaced: true,
  kind: 'Submariner',
  crd: true,
};
