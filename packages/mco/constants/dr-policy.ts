import { TFunction } from 'i18next';

export const ODF_MINIMUM_SUPPORT = '4.11.0';
export const STORAGE_SYSTEM_NAME = 'ocs-storagecluster-storagesystem';
export const CEPH_CLUSTER_NAME = 'ocs-storagecluster-cephcluster';
export const MANAGED_CLUSTER_REGION_CLAIM = 'region.open-cluster-management.io';

export const MAX_ALLOWED_CLUSTERS = 2;
export const DR_SECHEDULER_NAME = 'ramen';

export const REPLICATION_TYPE = (t: TFunction) => ({
  async: t('Asynchronous'),
  sync: t('Synchronous'),
});

export const Actions = (t: TFunction) => ({
  APPLY_DR_POLICY: t('plugin__odf-console~Apply DRPolicy'),
  DELETE_DR_POLICY: t('plugin__odf-console~Delete DRPolicy'),
});
