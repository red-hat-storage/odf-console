import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const ODFStorageSystem: K8sKind = {
  label: 'Storage System',
  labelPlural: 'Storage Systems',
  apiVersion: 'v1alpha1',
  apiGroup: 'odf.openshift.io',
  plural: 'storagesystems',
  abbr: 'ss',
  namespaced: true,
  kind: 'StorageSystem',
  id: 'storagesystem',
  crd: true,
};

// This model is used by HorizontalNav to limit the exposure of tabs to ODF Dashboard
export const ODFStorageSystemMock: K8sKind = {
  label: 'StorageSystem',
  labelPlural: 'StorageSystems',
  apiVersion: 'v1',
  apiGroup: 'console.odf.io',
  plural: 'storagesystems',
  abbr: 'SS',
  namespaced: true,
  kind: 'StorageSystem',
  crd: true,
};
