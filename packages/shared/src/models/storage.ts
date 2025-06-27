import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const ODFStorageSystem: K8sModel = {
  label: 'Storage System',
  labelPlural: 'Storage Systems',
  apiVersion: 'v1alpha1',
  apiGroup: 'odf.openshift.io',
  plural: 'storagesystems',
  abbr: 'ss',
  namespaced: true,
  kind: 'StorageSystem',
  crd: true,
};

export const StorageAutoScalerModel: K8sModel = {
  label: 'Storage Autoscaler',
  labelPlural: 'Storage Autoscalers',
  apiVersion: 'v1',
  apiGroup: 'ocs.openshift.io',
  plural: 'storageautoscalers',
  abbr: 'SAS',
  namespaced: true,
  kind: 'StorageAutoScaler',
  crd: true,
  id: 'storageautoscaler',
};

export const StorageClusterModel: K8sModel = {
  label: 'Storage Cluster',
  labelPlural: 'Storage Clusters',
  apiVersion: 'v1',
  apiGroup: 'ocs.openshift.io',
  plural: 'storageclusters',
  abbr: 'OCS',
  namespaced: true,
  kind: 'StorageCluster',
  crd: true,
  id: 'ocscluster',
};

export const CephClusterModel: K8sModel = {
  label: 'Ceph Cluster',
  labelPlural: 'Ceph Clusters',
  apiVersion: 'v1',
  apiGroup: 'ceph.rook.io',
  plural: 'cephclusters',
  abbr: 'CC',
  namespaced: true,
  kind: 'CephCluster',
  crd: true,
  id: 'cephcluster',
};

export const IBMFlashSystemModel: K8sModel = {
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
