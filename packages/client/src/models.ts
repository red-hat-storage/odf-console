import { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const StorageClientModel: K8sModel = {
  apiGroup: 'ocs.openshift.io',
  apiVersion: 'v1alpha1',
  kind: 'StorageClient',
  crd: true,
  namespaced: false,
  abbr: 'SC',
  plural: 'storageclients',
  label: 'Storage Client',
  labelPlural: 'Storage Clients',
};
