import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const LocalVolumeDiscoveryResult: K8sModel = {
  label: 'Local Volume Discovery Result',
  labelPlural: 'Local Volume Discovery Results',
  apiVersion: 'v1alpha1',
  apiGroup: 'local.storage.openshift.io',
  plural: 'localvolumediscoveryresults',
  abbr: 'LVDR',
  namespaced: true,
  kind: 'LocalVolumeDiscoveryResult',
  id: 'localvolumediscoveryresults',
  crd: true,
};

export const LocalVolumeSetModel: K8sModel = {
  label: 'Local Volume Set',
  labelPlural: 'Local Volume Sets',
  apiVersion: 'v1alpha1',
  apiGroup: 'local.storage.openshift.io',
  plural: 'localvolumesets',
  abbr: 'LVS',
  namespaced: true,
  kind: 'LocalVolumeSet',
  id: 'localvolumeset',
  crd: true,
};

export const LocalVolumeDiscovery: K8sModel = {
  label: 'Local Volume Discovery',
  labelPlural: 'Local Volume Discoveries',
  apiVersion: 'v1alpha1',
  apiGroup: 'local.storage.openshift.io',
  plural: 'localvolumediscoveries',
  abbr: 'LVD',
  namespaced: true,
  kind: 'LocalVolumeDiscovery',
  id: 'localvolumediscovery',
  crd: true,
};
