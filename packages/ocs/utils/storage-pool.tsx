import * as React from 'react';
import { ModalKeys } from '@odf/shared/modals/types';
import { getName } from '@odf/shared/selectors';
import {
  StorageClassResourceKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { getLastLanguage } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import {
  CheckCircleIcon,
  DisconnectedIcon,
  ExclamationCircleIcon,
  LockIcon,
} from '@patternfly/react-icons';
import {
  POOL_FS_DEFAULT,
  POOL_PROGRESS,
  POOL_TYPE,
  ROOK_MODEL,
} from '../constants';
import { StorageClusterModel } from '../models';
import { CephFilesystemKind, StoragePool, StoragePoolKind } from '../types';
import { LoadingComponent } from './CustomLoading';

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
  pool: StoragePool
): string[] =>
  scResources?.reduce((scList, sc) => {
    const poolName = getName(pool);
    if (
      sc.parameters?.pool === poolName ||
      (pool.type === POOL_TYPE.FILESYSTEM &&
        sc.parameters?.fsName === pool.fsName &&
        !sc.parameters?.pool &&
        pool.shortName === POOL_FS_DEFAULT)
    ) {
      scList.push(sc.metadata?.name);
    }
    return scList;
  }, []);

export const getPerPoolMetrics = (metrics, error, isLoading) =>
  // {"pool-1" : size_bytes, "pool-2" : size_bytes, ...}
  !error && !isLoading
    ? metrics?.data?.result?.reduce(
        (arr, obj) => ({ ...arr, [obj.metric?.name]: obj.value[1] }),
        {}
      )
    : {};

export const isDefaultPool = (pool: StoragePool): boolean => {
  if (pool?.type === POOL_TYPE.FILESYSTEM) {
    return pool?.metadata?.name === `${pool?.fsName}-${POOL_FS_DEFAULT}`;
  }
  return !!pool?.metadata.ownerReferences?.find(
    (ownerReference) => ownerReference.kind === StorageClusterModel.kind
  );
};

export const disableMenuAction = (pool: StoragePool, isExternal: boolean) =>
  !!(pool?.metadata?.deletionTimestamp || isExternal || isDefaultPool(pool));

export const getErrorMessage = (error: string): string =>
  error.replace(ROOK_MODEL, 'Pool');

export type ProgressStatusProps = {
  name: string;
  icon: React.ComponentClass | React.FC;
  desc: string;
  className: string;
};

export const PROGRESS_STATUS = (
  t: TFunction,
  poolName: string
): ProgressStatusProps[] => [
  {
    name: POOL_PROGRESS.PROGRESS,
    icon: LoadingComponent,
    desc: t('Pool {{name}} creation in progress', {
      name: poolName,
    }),
    className: '',
  },
  {
    name: POOL_PROGRESS.CREATED,
    icon: CheckCircleIcon,
    desc: t('Pool {{name}} was successfully created', {
      name: poolName,
    }),
    className: 'ceph-block-pool__check-icon',
  },
  {
    name: POOL_PROGRESS.FAILED,
    icon: ExclamationCircleIcon,
    desc: t('An error occurred. Pool {{name}} was not created', {
      name: poolName,
    }),
    className: 'ceph-block-pool__error-icon',
  },
  {
    name: POOL_PROGRESS.TIMEOUT,
    icon: DisconnectedIcon,
    desc: t(
      'Pool {{name}} creation timed out. Please check if odf operator and rook operator are running',
      { name: poolName }
    ),
    className: '',
  },
  {
    name: POOL_PROGRESS.CLUSTERNOTREADY,
    icon: LockIcon,
    desc: t(
      'The creation of a StorageCluster is still in progress or has failed. Try again after the StorageCuster is ready to use.'
    ),
    className: '',
  },
  {
    name: POOL_PROGRESS.NOTALLOWED,
    icon: LockIcon,
    desc: t(
      "Pool management tasks are not supported for default pool and Data Foundation's external mode."
    ),
    className: '',
  },
  {
    name: POOL_PROGRESS.NOTREADY,
    icon: ExclamationCircleIcon,
    desc: t('Pool {{name}} was created with errors.', {
      name: poolName,
    }),
    className: 'ceph-block-pool__error-icon',
  },
];

export const customActionsMap = {
  [ModalKeys.DELETE]: React.lazy(
    () => import('../modals/storage-pool/delete-storage-pool-modal')
  ),
  [ModalKeys.EDIT_RES]: React.lazy(
    () => import('../modals/storage-pool/update-storage-pool-modal')
  ),
};

export type PoolMetrics = {
  [poolName: string]: string;
};

export const getStoragePoolsFromFilesystem = (
  fs: CephFilesystemKind
): StoragePool[] => {
  const fsName = fs?.metadata?.name;
  return fs?.spec?.dataPools?.map((dataPool) => {
    return {
      fsName,
      // The default pool doesn't have the 'name' property set.
      metadata: {
        name: dataPool.name
          ? `${fsName}-${dataPool.name}`
          : `${fsName}-${POOL_FS_DEFAULT}`,
        namespace: fs?.metadata?.namespace,
      },
      spec: {
        compressionMode: dataPool?.compressionMode,
        replicated: dataPool?.replicated,
      },
      status: { phase: fs.status?.phase },
      shortName: dataPool.name ?? POOL_FS_DEFAULT,
      type: POOL_TYPE.FILESYSTEM,
    } as StoragePool;
  });
};

export const getStoragePoolsFromBlockPools = (
  blockPools: StoragePoolKind[]
): StoragePool[] => {
  return blockPools?.map((pool) => {
    pool['type'] = POOL_TYPE.BLOCK;
    return pool as StoragePool;
  });
};

export const getExistingFsPoolNames = (fsData: CephFilesystemKind): string[] =>
  fsData?.spec?.dataPools?.map((dataPool) => {
    return dataPool.name ?? POOL_FS_DEFAULT;
  });

export const getExistingBlockPoolNames = (
  blockPools: StoragePoolKind[]
): string[] => blockPools?.map((pool) => pool.metadata?.name);

export const getFsPoolIndex = (
  storageCluster: StorageClusterKind,
  poolName: string
) =>
  storageCluster.spec.managedResources?.cephFilesystems?.additionalDataPools.findIndex(
    (additionalPool) => additionalPool.name === poolName
  );
