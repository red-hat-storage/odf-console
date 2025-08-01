export const PVC_PROVISIONER_ANNOTATION =
  'volume.beta.kubernetes.io/storage-provisioner';
export const COMPRESSION_ON = 'aggressive';
export enum PoolState {
  READY = 'Ready',
  RECONCILE_FAILED = 'ReconcileFailed',
  FAILURE = 'Failure',
}
export enum PoolType {
  BLOCK = 'Block',
  FILESYSTEM = 'Filesystem',
}
export const POOL_FS_DEFAULT = 'data0';
export const ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH =
  '/spec/managedResources/cephFilesystems/additionalDataPools';

export const ROOK_MODEL = 'cephblockpools.ceph.rook.io';

export enum PoolProgress {
  CREATED = 'created',
  FAILED = 'failed',
  PROGRESS = 'progress',
  TIMEOUT = 'timeout',
  NOTREADY = 'notReady',
  CLUSTERNOTREADY = 'clusterNotReady',
  NOTALLOWED = 'notAllowed',
  BOUNDED = 'bounded',
}

export const OCS_DEVICE_REPLICA = Object.freeze({
  '2': '2-way',
  '3': '3-way',
  '4': '4-way',
});

// Pool utilization thresholds
export const POOL_NEAR_FULL_THRESHOLD = 85; // percent
export const POOL_FULL_THRESHOLD = 95; // percent

export enum PoolUtilizationState {
  NORMAL = 'NORMAL',
  NEAR_FULL = 'NEAR_FULL',
  FULL = 'FULL',
}

export enum ClusterStatus {
  READY = 'Ready',
  PROGRESSING = 'Progressing',
}

// StorageClass parameters for Ceph-CSI provisioners
// https://github.com/ceph/ceph-csi/blob/release-v3.5/examples/cephfs/storageclass.yaml
// https://github.com/ceph/ceph-csi/blob/release-v3.5/examples/rbd/storageclass.yaml
export const CLUSTER_ID = 'clusterID';
export const PROV_SECRET_NS = 'csi.storage.k8s.io/provisioner-secret-namespace';
export const NODE_SECRET_NS = 'csi.storage.k8s.io/node-stage-secret-namespace';
export const CONTROLLER_SECRET_NS =
  'csi.storage.k8s.io/controller-expand-secret-namespace';

// StorageClass parameter for legacy "flex" provisioner
// https://github.com/rook/rook/blob/release-1.7/cluster/examples/kubernetes/ceph/flex/storageclass.yaml
export const CLUSTER_NS = 'clusterNamespace';

// can be used to determine a Ceph cluster in case of multiple StorageSystem/StorageCluster scenarios
// we only have a single Ceph cluster per namespace
export const OCS_STORAGECLASS_PARAMS = [
  // represents the namespace of the Ceph cluster to provision storage from
  CLUSTER_ID,
  // represents the namespace of the secrets for user and/or Ceph admin credential
  PROV_SECRET_NS,
  NODE_SECRET_NS,
  CONTROLLER_SECRET_NS,
  // represents the namespace of the Rook cluster from which to create volumes
  CLUSTER_NS,
];

export const CEPH_NS_SESSION_STORAGE = 'odfConsole_scForm_cephNs';
export const BLOCK_POOL_NAME_LABEL = 'ocs.openshift.io/cephblockpool-name';
