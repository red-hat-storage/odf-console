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

/** Erasure coding pool spec under spec.dataPool (CephBlockPool EC structure). */
export type DataPoolErasureCoding = {
  failureDomain: string;
  erasureCoded: {
    dataChunks: number;
    codingChunks: number;
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
    /** Erasure coding: data and coding chunks (e.g. 4+2). Top-level for backward compatibility. */
    erasureCoded?: {
      dataChunks: number;
      codingChunks: number;
    };
    /** When present, erasure coding is specified under dataPool (failureDomain + erasureCoded). */
    dataPool?: DataPoolErasureCoding;
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
