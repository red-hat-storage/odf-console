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
    crd: true,
};

export const ACMManagedClusterModel: K8sModel = {
  apiVersion: 'v1',
  apiGroup: 'cluster.open-cluster-management.io',
  kind: 'ManagedCluster',
  plural: 'managedclusters',
  label: 'Managed Cluster',
  labelPlural: 'Managed Clusters',
  crd: true,
  abbr: 'MCL',
  namespaced: false,
};

export const MirrorPeerModel: K8sModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'multicluster.odf.openshift.io',
  kind: 'MirrorPeer',
  plural: 'mirrorpeers',
  label: 'Mirror Peer',
  labelPlural: 'Mirror Peers',
  crd: true,
  abbr: 'MP',
  namespaced: false,
};
