import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const ClusterServiceVersionModel: K8sKind = {
  kind: 'ClusterServiceVersion',
  label: 'ClusterServiceVersion',
  labelPlural: 'ClusterServiceVersions',
  apiGroup: 'operators.coreos.com',
  apiVersion: 'v1alpha1',
  abbr: 'CSV',
  namespaced: true,
  crd: true,
  plural: 'clusterserviceversions',
  propagationPolicy: 'Foreground',
  legacyPluralURL: true,
};

export const PersistentVolumeModel: K8sKind = {
  label: 'PersistentVolume',
  // t('plugin__odf-console~PersistentVolume')
  labelKey: 'plugin__odf-console~PersistentVolume',
  apiVersion: 'v1',
  plural: 'persistentvolumes',
  abbr: 'PV',
  kind: 'PersistentVolume',
  id: 'persistentvolume',
  labelPlural: 'PersistentVolumes',
  // t('plugin__odf-console~PersistentVolumes')
  labelPluralKey: 'plugin__odf-console~PersistentVolumes',
};

export const NodeModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Node',
  // t('plugin__odf-console~Node')
  labelKey: 'plugin__odf-console~Node',
  plural: 'nodes',
  abbr: 'N',
  kind: 'Node',
  id: 'node',
  labelPlural: 'Nodes',
  // t('plugin__odf-console~Nodes')
  labelPluralKey: 'plugin__odf-console~Nodes',
};

export const StorageClassModel: K8sKind = {
  label: 'StorageClass',
  // t('plugin__odf-console~StorageClass')
  labelKey: 'plugin__odf-console~StorageClass',
  labelPlural: 'StorageClasses',
  // t('plugin__odf-console~StorageClasses')
  labelPluralKey: 'plugin__odf-console~StorageClasses',
  apiVersion: 'v1',
  apiGroup: 'storage.k8s.io',
  plural: 'storageclasses',
  abbr: 'SC',
  namespaced: false,
  kind: 'StorageClass',
  id: 'storageclass',
};

export const SelfSubjectAccessReviewModel: K8sKind = {
  abbr: 'SSAR',
  kind: 'SelfSubjectAccessReview',
  label: 'SelfSubjectAccessReview',
  labelPlural: 'SelfSubjectAccessReviews',
  plural: 'selfsubjectaccessreviews',
  apiVersion: 'v1',
  apiGroup: 'authorization.k8s.io',
};
