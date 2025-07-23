import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const IBMFlashSystemModel: K8sKind = {
  label: 'IBM Flash System',
  labelPlural: 'IBM Flash Systems',
  apiVersion: 'v1alpha1',
  apiGroup: 'odf.ibm.com',
  plural: 'flashsystemclusters',
  abbr: 'FS',
  namespaced: true,
  kind: 'FlashSystemCluster',
  crd: true,
};
