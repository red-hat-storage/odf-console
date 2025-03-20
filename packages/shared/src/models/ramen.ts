import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const DRPolicyModel: K8sModel = {
  label: 'DRPolicy',
  labelPlural: 'DRPolicies',
  apiVersion: 'v1alpha1',
  apiGroup: 'ramendr.openshift.io',
  plural: 'drpolicies',
  abbr: 'DRP',
  namespaced: false,
  kind: 'DRPolicy',
  crd: true,
};

export const DRClusterModel: K8sModel = {
  label: 'DRCluster',
  labelPlural: 'DRClusters',
  apiVersion: 'v1alpha1',
  apiGroup: 'ramendr.openshift.io',
  plural: 'drclusters',
  abbr: 'DRC',
  namespaced: false,
  kind: 'DRCluster',
  crd: true,
};

export const DRPlacementControlModel: K8sModel = {
  label: 'DRPlacementControl',
  labelPlural: 'DRPlacementControls',
  apiVersion: 'v1alpha1',
  apiGroup: 'ramendr.openshift.io',
  plural: 'drplacementcontrols',
  abbr: 'DRPC',
  namespaced: true,
  kind: 'DRPlacementControl',
  crd: true,
};

export const DRVolumeReplicationGroup: K8sModel = {
  label: 'VolumeReplicationGroup',
  labelPlural: 'VolumeReplicationGroups',
  apiVersion: 'v1alpha1',
  apiGroup: 'ramendr.openshift.io',
  plural: 'volumereplicationgroups',
  abbr: 'VRG',
  namespaced: true,
  kind: 'VolumeReplicationGroup',
  crd: true,
};
