import { DataPool } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { PoolState, PoolType } from './constants';

export enum ImageStates {
  STARTING_REPLAY = 'starting_replay',
  STOPPING_REPLAY = 'stopping_replay',
  REPLAYING = 'replaying',
  STOPPED = 'stopped',
  ERROR = 'error',
  SYNCING = 'syncing',
  UNKNOWN = 'unknown',
}

export type States = { [state in ImageStates]: number } | {};

type MirroringStatus = {
  lastChecked: string;
  summary: {
    health: string;
    states: States;
    image_health: string;
  };
};

export type StoragePoolKind = K8sResourceCommon & {
  spec: DataPool & {
    enableCrushUpdates?: boolean;
    deviceClass?: string;
    failureDomain?: string;
    parameters?: {
      compression_mode: string;
    };
  };
  status?: {
    phase?: PoolState;
    mirroringStatus?: MirroringStatus;
  };
};

export type StoragePool = StoragePoolKind & {
  type: PoolType;
  fsName?: string;
  shortName?: string;
};

export type CephFilesystemKind = K8sResourceCommon & {
  spec: {
    dataPools: DataPool[];
  };
  status?: {
    phase?: string;
  };
};

export type ODFSystemParams = { namespace: string; systemName: string };

export type CephBlockPoolRadosNamespaceKind = K8sResourceCommon & {
  spec: {
    blockPoolName: string;
    mirroring: {
      mode: string;
    };
  };
  status?: {
    info: {
      clusterID: string;
    };
    phase?: PoolState;
    mirroringStatus?: MirroringStatus;
  };
};

// Pool utilization metrics - mapping of pool name to value
export type PoolMetrics = { [poolName: string]: string };
