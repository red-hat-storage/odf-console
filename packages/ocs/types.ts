import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

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
  spec: {
    compressionMode?: string;
    deviceClass?: string;
    failureDomain?: string;
    replicated: {
      size: number;
    };
    parameters?: {
      compression_mode: string;
    };
    mirroring?: {
      enabled: boolean;
    };
  };
  status?: {
    phase?: string;
    mirroringStatus?: {
      lastChecked: string;
      summary: {
        image_health: string;
        states: ImageStates | {};
      };
    };
  };
};
