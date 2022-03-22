import { K8sModel } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt/lib/api/common-types';


export const ApplicationModel: K8sModel = {
    label: 'Application',
    labelPlural: 'Applications',
    apiVersion: 'v1beta1',
    apiGroup: 'app.k8s.io',
    plural: 'applications',
    abbr: 'APP',
    namespaced: true,
    kind: 'Application',
    id: 'acmapplication',
    crd: true,
};

export const PlacementRuleModel: K8sModel = {
    label: 'Placement Rule',
    labelPlural: 'Placement Rules',
    apiVersion: 'v1',
    apiGroup: 'apps.open-cluster-management.io',
    plural: 'placementrules',
    abbr: 'PRL',
    namespaced: true,
    kind: 'PlacementRule',
    id: 'acmplacementrule',
    crd: true,
};

export const SubscriptionModel: K8sModel = {
    label: 'Subscription',
    labelPlural: 'Subscriptions',
    apiVersion: 'v1',
    apiGroup: 'apps.open-cluster-management.io',
    plural: 'subscriptions',
    abbr: 'SUBS',
    namespaced: true,
    kind: 'Subscription',
    id: 'acmsubscription',
    crd: true,
};
