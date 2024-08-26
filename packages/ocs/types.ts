import { DataPool } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { POOL_STATE, POOL_TYPE } from './constants';

export enum ImageStates {
  STARTING_REPLAY = 'starting_replay',
  STOPPING_REPLAY = 'stopping_replay',
  REPLAYING = 'replaying',
  STOPPED = 'stopped',
  ERROR = 'error',
  SYNCING = 'syncing',
  UNKNOWN = 'unknown',
}

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
    phase?: POOL_STATE;
    mirroringStatus?: {
      lastChecked: string;
      summary: {
        image_health: string;
        states: ImageStates | {};
      };
    };
  };
};

export type StoragePool = StoragePoolKind & {
  type: POOL_TYPE;
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
