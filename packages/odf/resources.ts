import {
  CephBlockPoolModel,
  NooBaaBackingStoreModel,
  NooBaaNamespaceStoreModel,
  LocalVolumeDiscoveryResult,
} from '@odf/core/models';
import { K8sResourceObj } from '@odf/core/types';
import {
  PersistentVolumeModel,
  StorageClassModel,
  StorageClusterModel,
  NodeModel,
  PersistentVolumeClaimModel,
  SecretModel,
  SubscriptionModel,
  CephClusterModel,
  PodModel,
  DeploymentModel,
  StatefulSetModel,
  ReplicaSetModel,
  DaemonSetModel,
  NamespaceModel,
} from '@odf/shared/models';
import { referenceForModel } from '@odf/shared/utils';
import { WatchK8sResource } from '@openshift-console/dynamic-plugin-sdk';

export const cephClusterResource: WatchK8sResource = {
  kind: referenceForModel(CephClusterModel),
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
/**
 * Retrieve all the CRs except those not meant to be
 * exposed to the users. See:
 * https://bugzilla.redhat.com/show_bug.cgi?id=2297295
 * https://issues.redhat.com/browse/DFBUGS-871
 */
export const getCephBlockPoolResource = (
  clusterName: string
): WatchK8sResource => {
  return {
    kind: referenceForModel(CephBlockPoolModel),
    isList: true,
    fieldSelector: `metadata.name!=builtin-mgr,metadata.name!=${clusterName}-cephnfs-builtin-pool`,
  };
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
  kind: referenceForModel(StorageClusterModel),
};

export const odfPodsResource: K8sResourceObj = (ns) => ({
  isList: true,
  kind: referenceForModel(PodModel),
  namespaced: true,
  namespace: ns,
});

export const odfDeploymentsResource: K8sResourceObj = (ns) => ({
  isList: true,
  kind: referenceForModel(DeploymentModel),
  namespaced: true,
  namespace: ns,
});

export const odfStatefulSetResource: K8sResourceObj = (ns) => ({
  isList: true,
  kind: referenceForModel(StatefulSetModel),
  namespaced: true,
  namespace: ns,
});

export const odfReplicaSetResource: K8sResourceObj = (ns) => ({
  isList: true,
  kind: referenceForModel(ReplicaSetModel),
  namespaced: true,
  namespace: ns,
});

export const odfDaemonSetResource: K8sResourceObj = (ns) => ({
  isList: true,
  kind: referenceForModel(DaemonSetModel),
  namespaced: true,
  namespace: ns,
});

export const secretResource: K8sResourceObj = (ns) => ({
  isList: false,
  kind: SecretModel.kind,
  namespace: ns,
  name: 'rook-ceph-external-cluster-details',
});

export const backingStoreResource: K8sResourceObj = (ns) => ({
  kind: referenceForModel(NooBaaBackingStoreModel),
  isList: true,
  namespace: ns,
});

export const namespaceStoreResource: K8sResourceObj = (ns) => ({
  kind: referenceForModel(NooBaaNamespaceStoreModel),
  isList: true,
  namespace: ns,
});

export const namespaceResource = {
  kind: referenceForModel(NamespaceModel),
  isList: true,
};
