export const PVC_PROVISIONER_ANNOTATION =
  'volume.beta.kubernetes.io/storage-provisioner';
export const COMPRESSION_ON = 'aggressive';
export enum POOL_STATE {
  READY = 'Ready',
  RECONCILE_FAILED = 'ReconcileFailed',
  FAILURE = 'Failure',
}

export const ROOK_MODEL = 'cephblockpools.ceph.rook.io';

export enum POOL_PROGRESS {
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

export enum CLUSTER_STATUS {
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
