import * as React from 'react';
import { CephBlockPoolModel, OCSStorageClusterModel } from '@odf/core/models';
import { getAPIVersionForModel } from '@odf/shared/utils';
import classNames from 'classnames';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  DisconnectedIcon,
  LockIcon,
} from '@patternfly/react-icons';
import { CEPH_STORAGE_NAMESPACE, COMPRESSION_ON, ROOK_MODEL, POOL_PROGRESS } from '../../constants';
import { StoragePoolKind, OcsStorageClassKind } from '../../types';

export const LoadingComponent: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');

  return (
    <span
      className="pf-c-spinner"
      role="progressbar"
      aria-valuetext={t('Loading...')}
    >
      <span className="pf-c-spinner__clipper" />
      <span className="pf-c-spinner__lead-ball" />
      <span className="pf-c-spinner__tail-ball" />
    </span>
  );
};

export const PROGRESS_STATUS = (t: TFunction, poolName: string): ProgressStatusProps[] => [
  {
    name: POOL_PROGRESS.PROGRESS,
    icon: LoadingComponent,
    desc: t('plugin__odf-console~Pool {{name}} creation in progress', { name: poolName }),
    className: '',
  },
  {
    name: POOL_PROGRESS.CREATED,
    icon: CheckCircleIcon,
    desc: t('plugin__odf-console~Pool {{name}} was successfully created', { name: poolName }),
    className: 'ceph-block-pool__check-icon',
  },
  {
    name: POOL_PROGRESS.FAILED,
    icon: ExclamationCircleIcon,
    desc: t('plugin__odf-console~An error occurred. Pool {{name}} was not created', {
      name: poolName,
    }),
    className: 'ceph-block-pool__error-icon',
  },
  {
    name: POOL_PROGRESS.TIMEOUT,
    icon: DisconnectedIcon,
    desc: t(
      'plugin__odf-console~Pool {{name}} creation timed out. Please check if odf operator and rook operator are running',
      { name: poolName },
    ),
    className: '',
  },
  {
    name: POOL_PROGRESS.CLUSTERNOTREADY,
    icon: LockIcon,
    desc: t(
      'plugin__odf-console~The creation of a StorageCluster is still in progress or has failed. Try again after the StorageCuster is ready to use.',
    ),
    className: '',
  },
  {
    name: POOL_PROGRESS.NOTALLOWED,
    icon: LockIcon,
    desc: t(
      "plugin__odf-console~Pool management tasks are not supported for default pool and OpenShift Container Storage's external mode.",
    ),
    className: '',
  },
  {
    name: POOL_PROGRESS.NOTREADY,
    icon: ExclamationCircleIcon,
    desc: t('plugin__odf-console~Pool {{name}} was created with errors.', { name: poolName }),
    className: 'ceph-block-pool__error-icon',
  },
];

export enum BlockPoolActionType {
  SET_POOL_NAME = 'SET_POOL_NAME',
  SET_POOL_STATUS = 'SET_POOL_STATUS',
  SET_POOL_REPLICA_SIZE = 'SET_POOL_REPLICA_SIZE',
  SET_POOL_COMPRESSED = 'SET_POOL_COMPRESSED',
  SET_POOL_ARBITER = 'SET_POOL_ARBITER',
  SET_POOL_VOLUME_TYPE = 'SET_POOL_VOLUME_TYPE',
  SET_FAILURE_DOMAIN = 'SET_FAILURE_DOMAIN',
  SET_INPROGRESS = 'SET_INPROGRESS',
  SET_ERROR_MESSAGE = 'SET_ERROR_MESSAGE',
}

export const blockPoolInitialState: BlockPoolState = {
  poolName: '',
  poolStatus: '',
  replicaSize: '',
  isCompressed: false,
  isArbiterCluster: false,
  volumeType: '',
  failureDomain: '',
  inProgress: false,
  errorMessage: '',
};

export const blockPoolReducer = (state: BlockPoolState, action: BlockPoolAction) => {
  switch (action.type) {
    case BlockPoolActionType.SET_POOL_NAME: {
      return {
        ...state,
        poolName: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_STATUS: {
      return {
        ...state,
        poolStatus: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_REPLICA_SIZE: {
      return {
        ...state,
        replicaSize: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_COMPRESSED: {
      return {
        ...state,
        isCompressed: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_ARBITER: {
      return {
        ...state,
        isArbiterCluster: action.payload,
      };
    }
    case BlockPoolActionType.SET_POOL_VOLUME_TYPE: {
      return {
        ...state,
        volumeType: action.payload,
      };
    }
    case BlockPoolActionType.SET_FAILURE_DOMAIN: {
      return {
        ...state,
        failureDomain: action.payload,
      };
    }
    case BlockPoolActionType.SET_INPROGRESS: {
      return {
        ...state,
        inProgress: action.payload,
      };
    }
    case BlockPoolActionType.SET_ERROR_MESSAGE: {
      return {
        ...state,
        errorMessage: action.payload,
      };
    }
    default:
      return state;
  }
};

export const getErrorMessage = (error: string): string => error.replace(ROOK_MODEL, 'Pool');

export const getPoolKindObj = (state: BlockPoolState): StoragePoolKind => ({
  apiVersion: getAPIVersionForModel(CephBlockPoolModel),
  kind: CephBlockPoolModel.kind,
  metadata: {
    name: state.poolName,
    namespace: CEPH_STORAGE_NAMESPACE,
  },
  spec: {
    compressionMode: state.isCompressed ? COMPRESSION_ON : 'none',
    deviceClass: state.volumeType || '',
    failureDomain: state.failureDomain,
    parameters: {
      compression_mode: state.isCompressed ? COMPRESSION_ON : 'none',
    },
    replicated: {
      size: Number(state.replicaSize),
    },
  },
});

export const checkRequiredValues = (
  poolName: string,
  replicaSize: string,
  volumeType: string,
  isPoolManagementSupported: boolean,
): boolean => !poolName || !replicaSize || (isPoolManagementSupported && !volumeType);

export const FooterPrimaryActions = (t: TFunction) => ({
  CREATE: t('plugin__odf-console~Create'),
  DELETE: t('plugin__odf-console~Delete'),
  UPDATE: t('plugin__odf-console~Save'),
});

export const isDefaultPool = (blockPoolConfig: StoragePoolKind): boolean =>
  !!blockPoolConfig?.metadata.ownerReferences?.find(
    (ownerReference) => ownerReference.kind === OCSStorageClusterModel.kind,
  );

export const BlockPoolColumnInfo = (t: TFunction) => ({
  /**
   * 2xl screen: all
   * xl: name, status, storageclasses, replicas, mirroringstatus, compressionstatus
   * lg: name, status, storageclasses, replicas
   * md: name, status
   * sm: name
   */
  name: {
    classes: classNames('pf-u-w-16-on-2xl'),
    id: 'name',
    title: t('plugin__odf-console~Name'),
  },
  status: {
    classes: classNames('pf-m-hidden', 'pf-m-visible-on-md', 'pf-u-w-8-on-2xl'),
    id: 'status',
    title: t('plugin__odf-console~Status'),
  },
  storageclasses: {
    classes: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'storageclasses',
    title: t('plugin__odf-console~StorageClasses'),
  },
  replicas: {
    classes: classNames('pf-m-hidden', 'pf-m-visible-on-lg', 'pf-u-w-8-on-2xl'),
    id: 'replicas',
    title: t('plugin__odf-console~Replicas'),
  },
  usedcapacity: {
    classes: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'),
    id: 'usedcapacity',
    title: t('plugin__odf-console~Used capacity'),
  },
  mirroringstatus: {
    classes: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'mirroringstatus',
    title: t('plugin__odf-console~Mirroring status'),
  },
  overallImagehealth: {
    classes: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'),
    id: 'overallImagehealth',
    title: t('plugin__odf-console~Overall image health'),
  },
  compressionstatus: {
    classes: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'compressionstatus',
    title: t('plugin__odf-console~Compression status'),
  },
  compressionsavings: {
    classes: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'),
    id: 'compressionsavings',
    title: t('plugin__odf-console~Compression savings'),
  },
});

export const getScNamesUsingPool = (
  scResources: OcsStorageClassKind[],
  poolName: string,
): string[] =>
  scResources.reduce((scList, sc) => {
    if (sc.parameters?.pool === poolName) scList.push(sc.metadata?.name);
    return scList;
  }, []);

export const getPerPoolMetrics = (metrics, error, isLoading) =>
  // {"pool-1" : size_bytes, "pool-2" : size_bytes, ...}
  !error && !isLoading
    ? metrics.data?.result?.reduce((arr, obj) => ({ ...arr, [obj.metric?.name]: obj.value[1] }), {})
    : {};

export type BlockPoolAction =
  | { type: BlockPoolActionType.SET_POOL_NAME; payload: string }
  | { type: BlockPoolActionType.SET_POOL_STATUS; payload: string }
  | { type: BlockPoolActionType.SET_POOL_REPLICA_SIZE; payload: string }
  | { type: BlockPoolActionType.SET_POOL_COMPRESSED; payload: boolean }
  | { type: BlockPoolActionType.SET_POOL_ARBITER; payload: boolean }
  | { type: BlockPoolActionType.SET_POOL_VOLUME_TYPE; payload: string }
  | { type: BlockPoolActionType.SET_FAILURE_DOMAIN; payload: string }
  | { type: BlockPoolActionType.SET_INPROGRESS; payload: boolean }
  | { type: BlockPoolActionType.SET_ERROR_MESSAGE; payload: string };

export type ProgressStatusProps = {
  name: string;
  icon: React.ComponentClass | React.FC;
  desc: string;
  className: string;
};

export type BlockPoolState = {
  poolName: string;
  poolStatus: string;
  replicaSize: string;
  isCompressed: boolean;
  isArbiterCluster: boolean;
  volumeType: string;
  failureDomain: string;
  inProgress: boolean;
  errorMessage: string;
};
