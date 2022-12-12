import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const ACMPlacementRuleModel: K8sModel = {
  label: 'Placement Rule',
  labelPlural: 'Placement Rules',
  apiVersion: 'v1',
  apiGroup: 'apps.open-cluster-management.io',
  plural: 'placementrules',
  abbr: 'PRL',
  namespaced: true,
  kind: 'PlacementRule',
  crd: true,
};

export const ACMSubscriptionModel: K8sModel = {
  label: 'Subscription',
  labelPlural: 'Subscriptions',
  apiVersion: 'v1',
  apiGroup: 'apps.open-cluster-management.io',
  plural: 'subscriptions',
  abbr: 'SUBS',
  namespaced: true,
  kind: 'Subscription',
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
