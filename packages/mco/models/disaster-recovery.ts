import { K8sModel } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt/lib/api/common-types';


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

export const DRPlacementControlModel: K8sModel = {
    label: 'DR Placement Control',
    labelPlural: 'DR Placement Controls',
    apiVersion: 'v1alpha1',
    apiGroup: 'ramendr.openshift.io',
    plural: 'drplacementcontrols',
    abbr: 'DRPC',
    namespaced: true,
    kind: 'DRPlacementControl',
    id: 'drplacementcontrol',
    crd: true,
};
