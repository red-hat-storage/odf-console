import { TFunction } from 'i18next';

export const MANAGED_CLUSTER_REGION_CLAIM = 'region.open-cluster-management.io';
export const DR_SECHEDULER_NAME = 'ramen';

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
  APPLY_DR_POLICY: t('Apply DRPolicy'),
  DELETE_DR_POLICY: t('Delete DRPolicy'),
});
