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
    id: 'drpolicy',
    crd: true,
};
