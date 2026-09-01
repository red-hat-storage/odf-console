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
    erasureCoded?: {
      dataChunks: number;
      codingChunks: number;
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

export enum NooBaaSystemPhase {
  Rejected = 'Rejected',
  Verifying = 'Verifying',
  Creating = 'Creating',
  Connecting = 'Connecting',
  Configuring = 'Configuring',
  Ready = 'Ready',
}

export type NooBaaStatus = {
  observedGeneration?: number;
  phase?: NooBaaSystemPhase;
  conditions?: Array<{
    type: string;
    status: string;
    reason?: string;
    message?: string;
    lastTransitionTime?: string;
  }>;
  relatedObjects?: K8sResourceCommon[];
  actualImage?: string;
  upgradePhase?: string;
  postgresUpdatePhase?: string;
  readme?: string;
  lastKeyRotateTime?: string;
  beforeUpgradeDbImage?: string;
  accounts?: {
    admin: {
      secretRef: {
        name: string;
        namespace: string;
      };
    };
  };
  services?: Record<string, unknown>;
  endpoints?: {
    readyCount: number;
    virtualHosts: string[];
  };
  dbStatus?: Record<string, unknown>;
};

export type NooBaaKind = K8sResourceCommon & {
  spec?: Record<string, unknown>;
  status?: NooBaaStatus;
};
