import {
  K8sKind,
  K8sModel,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const CephObjectStoreModel: K8sKind = {
  label: 'Ceph Object Store',
  labelPlural: 'Ceph Object Stores',
  apiVersion: 'v1',
  apiGroup: 'ceph.rook.io',
  plural: 'cephobjectstores',
  abbr: 'COS',
  namespaced: true,
  kind: 'CephObjectStore',
  id: 'cephobjectstores',
  crd: true,
};

export const NooBaaSystemModel: K8sKind = {
  label: 'NooBaa System',
  labelPlural: 'NooBaa Systems',
  apiVersion: 'v1alpha1',
  apiGroup: 'noobaa.io',
  plural: 'noobaas',
  abbr: 'NB',
  namespaced: true,
  kind: 'NooBaa',
  id: 'noobaasystem',
  crd: true,
  legacyPluralURL: true,
};

export const CephBlockPoolModel: K8sKind = {
  label: 'BlockPool',
  labelPlural: 'BlockPools',
  apiVersion: 'v1',
  apiGroup: 'ceph.rook.io',
  plural: 'cephblockpools',
  abbr: 'CBP',
  namespaced: true,
  kind: 'CephBlockPool',
  id: 'cephblockpools',
  crd: true,
};

export const CephFileSystemModel: K8sModel = {
  label: 'CephFilesystem',
  labelPlural: 'CephFilesystems',
  apiVersion: 'v1',
  apiGroup: 'ceph.rook.io',
  plural: 'cephfilesystems',
  abbr: 'CFS',
  namespaced: true,
  kind: 'CephFilesystem',
  id: 'cephfilesystems',
  crd: true,
};

export const CephBlockPoolRadosNamespaceModel: K8sKind = {
  label: 'CephBlockPoolRadosNamespace',
  labelPlural: 'CephBlockPoolRadosNamespaces',
  apiVersion: 'v1',
  apiGroup: 'ceph.rook.io',
  plural: 'cephblockpoolradosnamespaces',
  abbr: 'CBPR',
  namespaced: true,
  kind: 'CephBlockPoolRadosNamespace',
  id: 'cephblockpoolradosnamespaces',
  crd: true,
};
