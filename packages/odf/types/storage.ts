import { StorageClassResourceKind } from '@odf/shared/types';
import { K8sResourceCommon } from "@openshift-console/dynamic-plugin-sdk";

type CephDeviceClass = {
  name: string;
};

export type StorageSystemKind = K8sResourceCommon & {
  spec: {
      kind: string;
      name: string;
      namespace: string;
  };
  status?: {
      phase?: string;
      conditions?: any;
  };
};

export type StorageClusterKind = K8sResourceCommon & {
    spec: {
      network?: {
        provider: string;
        selectors: {
          public: string;
          private?: string;
        };
      };
      manageNodes?: boolean;
      storageDeviceSets?: DeviceSet[];
      resources?: StorageClusterResource;
      arbiter?: {
        enable: boolean;
      };
      nodeTopologies?: {
        arbiterLocation: string;
      };
      encryption?: {
        /** @deprecated - enable is deprecated from 4.10 */
        enable: boolean;
        clusterWide: boolean;
        storageClass: boolean;
        kms?: {
          enable: boolean;
        };
      };
      flexibleScaling?: boolean;
      monDataDirHostPath?: string;
      multiCloudGateway?: {
        reconcileStrategy: string;
        dbStorageClassName: string;
      };
    };
    status?: {
      phase: string;
      failureDomain?: string;
    };
};

export type CephClusterKind = K8sResourceCommon & {
  status: {
    storage: {
      deviceClasses: CephDeviceClass[];
    };
    phase?: string;
  };
};

export type DeviceSet = {
    name: string;
    count: number;
    replica: number;
    resources: ResourceConstraints;
    placement?: any;
    portable: boolean;
    dataPVCTemplate: {
        spec: {
            storageClassName: string;
            accessModes: string[];
            volumeMode: string;
            resources: {
                requests: {
                    storage: string;
                };
            };
        };
    };
};

export type StorageClusterResource = {
    mds?: ResourceConstraints;
    rgw?: ResourceConstraints;
};

export type ResourceConstraints = {
    limits?: {
        cpu: string;
        memory: string;
    };
    requests?: {
        cpu: string;
        memory: string;
    };
};

export const MIN_SPEC_RESOURCES: StorageClusterResource = {
  mds: {
    limits: {
      cpu: '3',
      memory: '8Gi',
    },
    requests: {
      cpu: '1',
      memory: '8Gi',
    },
  },
  rgw: {
    limits: {
      cpu: '2',
      memory: '4Gi',
    },
    requests: {
      cpu: '1',
      memory: '4Gi',
    },
  },
};

export const MIN_DEVICESET_RESOURCES: ResourceConstraints = {
  limits: {
    cpu: '2',
    memory: '5Gi',
  },
  requests: {
    cpu: '1',
    memory: '5Gi',
  },
};

export type OcsStorageClassKind = StorageClassResourceKind & {
  parameters: {
    pool: string;
  };
};

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

export enum ImageStates {
  STARTING_REPLAY = 'starting_replay',
  STOPPING_REPLAY = 'stopping_replay',
  REPLAYING = 'replaying',
  STOPPED = 'stopped',
  ERROR = 'error',
  SYNCING = 'syncing',
  UNKNOWN = 'unknown',
}
