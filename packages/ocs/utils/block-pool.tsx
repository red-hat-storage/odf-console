import { StorageClassResourceKind, CephClusterKind } from '@odf/shared/types';
import { getLastLanguage } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import {
  CheckCircleIcon,
  DisconnectedIcon,
  ExclamationCircleIcon,
  LockIcon,
} from '@patternfly/react-icons';
import { CEPH_EXTERNAL_CR_NAME, POOL_PROGRESS, ROOK_MODEL } from '../constants';
import { StorageClusterModel } from '../models';
import { StoragePoolKind } from '../types';
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
      "Pool management tasks are not supported for default pool and OpenShift Container Storage's external mode."
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
