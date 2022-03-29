import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';


export const AcmMultiClusterObservabilityModel: K8sModel = {
    label: 'multiclusterobservability',
    labelPlural: 'multiclusterobservabilities',
    apiVersion: 'v1beta2',
    apiGroup: 'observability.open-cluster-management.io',
    plural: 'multiclusterobservabilities',
    abbr: 'mco',
    namespaced: false,
    kind: 'MultiClusterObservability',
    id: 'acmobservability',
    crd: true,
  };
