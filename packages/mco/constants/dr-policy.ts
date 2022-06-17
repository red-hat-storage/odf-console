import { TFunction } from 'i18next';

export const ODF_MINIMUM_SUPPORT = '4.11.0';
export const MANAGED_CLUSTER_REGION_CLAIM = 'region.open-cluster-management.io';
export const MAX_ALLOWED_CLUSTERS = 2;
export const DR_SECHEDULER_NAME = 'ramen';

export enum REPLICATION_TYPE {
  ASYNC = 'async',
  SYNC = 'sync',
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
