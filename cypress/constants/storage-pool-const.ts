export enum PoolState {
  READY = 'Ready',
  RECONCILE_FAILED = 'ReconcileFailed',
  FAILURE = 'Failure',
}

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

export enum PoolType {
  BLOCK = 'Block',
  FILESYSTEM = 'Filesystem',
}

export const COMPRESSION_ON = 'aggressive';
export const ROOK_MODEL = 'cephblockpools.ceph.rook.io';
export const CEPH_BUILTIN_MGR_POOL = 'builtin-mgr';
export const CEPH_BUILTIN_NFS_POOL = 'ocs-storagecluster-cephnfs-builtin-pool';
export const CEPH_DEFAULT_BLOCK_POOL_NAME = 'ocs-storagecluster-cephblockpool';
export const CEPH_DEFAULT_FS_POOL_PREFIX = 'ocs-storagecluster-cephfilesystem';
export const CEPH_DEFAULT_FS_POOL_NAME = `${CEPH_DEFAULT_FS_POOL_PREFIX}-data0`;
