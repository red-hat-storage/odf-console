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

export const InfrastructureModel: K8sKind = {
  label: 'Infrastructure',
  // t('Infrastructure')
  labelKey: 'Infrastructure',
  labelPlural: 'Infrastructures',
  // t('Infrastructures')
  labelPluralKey: 'Infrastructures',
  apiVersion: 'v1',
  apiGroup: 'config.openshift.io',
  plural: 'infrastructures',
  abbr: 'INF',
  namespaced: false,
  kind: 'Infrastructure',
  id: 'infrastructure',
  crd: true,
};

export const SubscriptionModel: K8sKind = {
  kind: 'Subscription',
  label: 'Subscription',
  // t('Subscription')
  labelKey: 'Subscription',
  labelPlural: 'Subscriptions',
  // t('Subscriptions')
  labelPluralKey: 'Subscriptions',
  apiGroup: 'operators.coreos.com',
  apiVersion: 'v1alpha1',
  abbr: 'SUB',
  namespaced: true,
  crd: true,
  plural: 'subscriptions',
  legacyPluralURL: true,
};

export const ProjectModel: K8sKind = {
  apiVersion: 'v1',
  apiGroup: 'project.openshift.io',
  label: 'Project',
  // t('Project')
  labelKey: 'Project',
  plural: 'projects',
  abbr: 'PR',
  kind: 'Project',
  id: 'project',
  labelPlural: 'Projects',
  // t('Projects')
  labelPluralKey: 'Projects',
};
