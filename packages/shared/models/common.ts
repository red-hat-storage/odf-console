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
  // t('public~PersistentVolume')
  labelKey: 'public~PersistentVolume',
  apiVersion: 'v1',
  plural: 'persistentvolumes',
  abbr: 'PV',
  kind: 'PersistentVolume',
  id: 'persistentvolume',
  labelPlural: 'PersistentVolumes',
  // t('public~PersistentVolumes')
  labelPluralKey: 'public~PersistentVolumes',
};

export const NodeModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Node',
  // t('public~Node')
  labelKey: 'public~Node',
  plural: 'nodes',
  abbr: 'N',
  kind: 'Node',
  id: 'node',
  labelPlural: 'Nodes',
  // t('public~Nodes')
  labelPluralKey: 'public~Nodes',
};
