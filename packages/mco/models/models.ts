import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const DRPolicyModel: K8sModel = {
    label: 'DR Policy',
    labelPlural: 'DR Policies',
    apiVersion: 'v1alpha1',
    apiGroup: 'ramendr.openshift.io',
    plural: 'drpolicies',
    abbr: 'DRP',
    namespaced: false,
    kind: 'DRPolicy',
    id: 'drpolicy',
    crd: true,
};

export const ODFStorageSystem: K8sModel = {
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

export const OCSStorageClusterModel: K8sModel = {
  label: 'Storage Cluster',
  labelPlural: 'Storage Clusters',
  apiVersion: 'v1',
  apiGroup: 'ocs.openshift.io',
  plural: 'storageclusters',
  abbr: 'OCS',
  namespaced: true,
  kind: 'StorageCluster',
  id: 'ocscluster',
  crd: true,
};
