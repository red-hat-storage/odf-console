import { TFunction } from 'i18next';

export const MANAGED_CLUSTER_REGION_CLAIM = 'region.open-cluster-management.io';
export const DR_SECHEDULER_NAME = 'ramen';
export const PLACEMENT_REF_LABEL =
  'cluster.open-cluster-management.io/placement';
export const PROTECTED_APP_ANNOTATION =
  'cluster.open-cluster-management.io/experimental-scheduling-disable';
// "~1" is used to represent a "/", else any "patch" call will treat prefix as a path
export const PROTECTED_APP_ANNOTATION_WO_SLASH =
  'cluster.open-cluster-management.io~1experimental-scheduling-disable';

export enum DRPlacementControlStatus {
  FailedOver = 'FailedOver',
  Relocating = 'Relocating',
  FailingOver = 'FailingOver',
  Relocated = 'Relocated',
}

export enum DRActionType {
  FAILOVER = 'Failover',
  RELOCATE = 'Relocate',
}

export enum REPLICATION_TYPE {
  ASYNC = 'async',
  SYNC = 'sync',
}

// Please refer to clusterclaims.go in github.com/red-hat-storage/ocs-operator before changing anything here
export enum ClusterClaimTypes {
  ODF_VERSION = 'version.odf.openshift.io',
  STORAGE_CLUSTER_NAME = 'storageclustername.odf.openshift.io',
  STORAGE_SYSTEM_NAME = 'storagesystemname.odf.openshift.io',
  CEPH_FSID = 'cephfsid.odf.openshift.io',
}

export const REPLICATION_DISPLAY_TEXT = (
  t: TFunction
): { [key in REPLICATION_TYPE]: string } => ({
  async: t('Asynchronous'),
  sync: t('Synchronous'),
});

export const Actions = (t: TFunction) => ({
  MANAGE_DR_POLICY: t('Manage DRPolicy'),
  APPLY_DR_POLICY: t('Apply DRPolicy'),
  DELETE_DR_POLICY: t('Delete DRPolicy'),
});

export enum APPLICATION_TYPE {
  APPSET = 'ApplicationSet',
}
