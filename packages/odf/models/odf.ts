import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

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
