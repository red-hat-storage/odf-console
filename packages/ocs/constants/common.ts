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

export const CLUSTER_ID = 'clusterID';
export const PROV_SECRET_NS = 'csi.storage.k8s.io/provisioner-secret-namespace';
export const NODE_SECRET_NS = 'csi.storage.k8s.io/node-stage-secret-namespace';
export const CONTROLLER_SECRET_NS =
  'csi.storage.k8s.io/controller-expand-secret-namespace';
export const CEPH_NS_SESSION_STORAGE = 'odfConsole_scForm_cephNs';
