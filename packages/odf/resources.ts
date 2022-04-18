import {
  CephBlockPoolModel,
  OCSStorageClusterModel,
  NooBaaBackingStoreModel,
  NooBaaNamespaceStoreModel,
  LocalVolumeDiscoveryResult,
} from '@odf/core/models';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import {
  PersistentVolumeModel,
  StorageClassModel,
  NodeModel,
  PersistentVolumeClaimModel,
  SecretModel,
  SubscriptionModel,
  CephClusterModel,
} from '@odf/shared/models';
import { referenceForModel } from '@odf/shared/utils';;
import { WatchK8sResource } from '@openshift-console/dynamic-plugin-sdk';

export const cephClusterResource: WatchK8sResource = {
  kind: referenceForModel(CephClusterModel),
  namespaced: false,
  isList: true,
};

export const pvResource: WatchK8sResource = {
  kind: PersistentVolumeModel.kind,
  namespaced: false,
  isList: true,
};

export const pvcResource: WatchK8sResource = {
  isList: true,
  kind: PersistentVolumeClaimModel.kind,
};

export const scResource: WatchK8sResource = {
  kind: StorageClassModel.kind,
  namespaced: false,
  isList: true,
};

export const LSOSubscriptionResource: WatchK8sResource = {
  kind: referenceForModel(SubscriptionModel),
  fieldSelector: 'metadata.name=local-storage-operator',
  isList: true,
};

export const subscriptionResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(SubscriptionModel),
  namespaced: false,
};

export const cephBlockPoolResource: WatchK8sResource = {
  kind: referenceForModel(CephBlockPoolModel),
  namespaced: true,
  isList: true,
  namespace: CEPH_STORAGE_NAMESPACE,
};


export const nodeResource: WatchK8sResource = {
  kind: NodeModel.kind,
  namespaced: false,
  isList: true,
};

export const nodesDiscoveriesResource: WatchK8sResource = {
  kind: referenceForModel(LocalVolumeDiscoveryResult),
  namespaced: false,
  isList: true,
};

export const storageClusterResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(OCSStorageClusterModel),
  namespaced: false,
};

export const secretResource: WatchK8sResource = {
  isList: false,
  kind: SecretModel.kind,
  namespace: CEPH_STORAGE_NAMESPACE,
  name: 'rook-ceph-external-cluster-details',
};

export const backingStoreResource = {
  kind: referenceForModel(NooBaaBackingStoreModel),
  isList: true,
  namespace: CEPH_STORAGE_NAMESPACE,
};

export const namespaceStoreResource = {
  kind: referenceForModel(NooBaaNamespaceStoreModel),
  isList: true,
  namespace: CEPH_STORAGE_NAMESPACE,
};
