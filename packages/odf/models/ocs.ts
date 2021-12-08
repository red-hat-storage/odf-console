import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const OCSStorageClusterModel: K8sKind = {
    label: 'Storage Cluster',
    labelPlural: 'Storage Clusters',
    apiVersion: 'v1',
    apiGroup: 'ocs.openshift.io',
    plural: 'storageclusters',
    abbr: 'OCS',
    namespaced: true,
    kind: 'StorageCluster',
    id: 'ocscluster',
    crd: true,
};
