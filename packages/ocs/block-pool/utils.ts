import { StorageClassResourceKind } from '@odf/shared/types';
import { getLastLanguage } from '@odf/shared/utils';
import { CEPH_EXTERNAL_CR_NAME } from '../constants';
import { StorageClusterModel } from '../models';
import { CephClusterKind, StoragePoolKind } from '../types';

export const twelveHoursdateTimeNoYear = new Intl.DateTimeFormat(
  getLastLanguage() || undefined,
  {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }
);

export const getScNamesUsingPool = (
  scResources: StorageClassResourceKind[],
  poolName: string
): string[] =>
  scResources?.reduce((scList, sc) => {
    if (sc.parameters?.pool === poolName) scList.push(sc.metadata?.name);
    return scList;
  }, []);

export const getPerPoolMetrics = (metrics, error, isLoading) =>
  // {"pool-1" : size_bytes, "pool-2" : size_bytes, ...}
  !error && !isLoading
    ? metrics.data?.result?.reduce(
        (arr, obj) => ({ ...arr, [obj.metric?.name]: obj.value[1] }),
        {}
      )
    : {};

export const isDefaultPool = (blockPoolConfig: StoragePoolKind): boolean =>
  !!blockPoolConfig?.metadata.ownerReferences?.find(
    (ownerReference) => ownerReference.kind === StorageClusterModel.kind
  );

export const disableMenuAction = (
  blockPoolConfig: StoragePoolKind,
  cephCluster: CephClusterKind
) =>
  !!(
    blockPoolConfig?.metadata?.deletionTimestamp ||
    cephCluster?.metadata?.name === CEPH_EXTERNAL_CR_NAME ||
    isDefaultPool(blockPoolConfig)
  );
