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
    // t('plugin__odf-console~Infrastructure')
    labelKey: 'plugin__odf-console~Infrastructure',
    labelPlural: 'Infrastructures',
    // t('plugin__odf-console~Infrastructures')
    labelPluralKey: 'plugin__odf-console~Infrastructures',
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
    // t('plugin__odf-console~Subscription')
    labelKey: 'plugin__odf-console~Subscription',
    labelPlural: 'Subscriptions',
    // t('plugin__odf-console~Subscriptions')
    labelPluralKey: 'plugin__odf-console~Subscriptions',
    apiGroup: 'operators.coreos.com',
    apiVersion: 'v1alpha1',
    abbr: 'SUB',
    namespaced: true,
    crd: true,
    plural: 'subscriptions',
    legacyPluralURL: true,
  };

export const EventModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Event',
  // t('public~Event')
  labelKey: 'public~Event',
  plural: 'events',
  abbr: 'E',
  namespaced: true,
  kind: 'Event',
  id: 'event',
  labelPlural: 'Events',
  // t('public~Events')
  labelPluralKey: 'public~Events',
};
