import {
  CephBlockPoolModel,
  NooBaaBackingStoreModel,
  NooBaaNamespaceStoreModel,
  LocalVolumeDiscoveryResult,
} from '@odf/core/models';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import {
  PersistentVolumeModel,
  StorageClassModel,
  OCSStorageClusterModel,
  NodeModel,
  PersistentVolumeClaimModel,
  SecretModel,
  SubscriptionModel,
  CephClusterModel,
  ODFStorageSystem,
  PodModel,
  DeploymentModel,
  StatefulSetModel,
  ReplicaSetModel,
  DaemonSetModel,
} from '@odf/shared/models';
import { referenceForModel } from '@odf/shared/utils';
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

export const odfPodsResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(PodModel),
  namespaced: true,
  namespace: 'openshift-storage',
};

export const odfDeploymentsResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(DeploymentModel),
  namespaced: true,
  namespace: 'openshift-storage',
};

export const odfStatefulSetResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(StatefulSetModel),
  namespaced: true,
  namespace: 'openshift-storage',
};

export const odfReplicaSetResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(ReplicaSetModel),
  namespaced: true,
  namespace: 'openshift-storage',
};

export const odfDaemonSetResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(DaemonSetModel),
  namespaced: true,
  namespace: 'openshift-storage',
};

export const odfSystemResource: WatchK8sResource = {
  isList: false,
  kind: referenceForModel(ODFStorageSystem),
  namespace: 'openshift-storage',
  name: 'ocs-storagecluster-storagesystem',
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
