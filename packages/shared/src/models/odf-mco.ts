import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const MirrorPeerModel: K8sModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'multicluster.odf.openshift.io',
  kind: 'MirrorPeer',
  plural: 'mirrorpeers',
  label: 'MirrorPeer',
  labelPlural: 'MirrorPeers',
  crd: true,
  abbr: 'MP',
  namespaced: false,
};

export const S3ConfigurationModel: K8sModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'multicluster.odf.openshift.io',
  kind: 'S3Configuration',
  plural: 's3configurations',
  label: 'S3 Configuration',
  labelPlural: 'S3 Configurations',
  crd: true,
  abbr: 'S3C',
  namespaced: false,
};

export const ProtectedApplicationViewModel: K8sModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'multicluster.odf.openshift.io',
  kind: 'ProtectedApplicationView',
  plural: 'protectedapplicationviews',
  abbr: 'PAV',
  namespaced: true,
  label: 'Protected Application View',
  labelPlural: 'Protected Application Views',
  crd: true,
};
