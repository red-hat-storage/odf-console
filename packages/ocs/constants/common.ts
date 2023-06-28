export const PVC_PROVISIONER_ANNOTATION =
  'volume.beta.kubernetes.io/storage-provisioner';
export const OCS_OPERATOR = 'ocs-operator';

export const CEPH_NS = 'openshift-storage';

export const cephStorageLabel = 'cluster.ocs.openshift.io/openshift-storage';

export const COMPRESSION_ON = 'aggressive';
export const CEPH_EXTERNAL_CR_NAME = 'ocs-external-storagecluster-cephcluster';

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

export const OCS_POOL_MANAGEMENT = 'OCS_POOL_MANAGEMENT';

export enum CLUSTER_STATUS {
  READY = 'Ready',
  PROGRESSING = 'Progressing',
}

export const CEPH_INTERNAL_CR_NAME = 'ocs-storagecluster-cephcluster';
