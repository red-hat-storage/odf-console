import { ResourceProfile } from '@odf/core/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type DataPool = {
  compressionMode?: string;
  mirroring?: {
    enabled: boolean;
  };
  name?: string;
  replicated?: {
    size: number;
  };
};

export enum StorageClusterPhase {
  Ready = 'Ready',
  Error = 'Error',
}

export type StorageClusterKind = K8sResourceCommon & {
  spec: {
    network?: {
      connections?: {
        encryption: {
          enabled: boolean;
        };
      };
      provider?: string;
      selectors?: {
        public: string;
        private?: string;
      };
      addressRanges?: {
        public: string[];
        cluster: string[];
      };
    };
    nfs?: {
      enable?: boolean;
    };
    managedResources?: {
      cephCluster: {
        monCount: 3 | 5;
      };
      cephBlockPools?: {
        defaultStorageClass?: boolean;
        defaultVirtualizationStorageClass?: boolean;
      };
      cephFilesystems?: {
        additionalDataPools?: DataPool[];
      };
      cephObjectStores?: {
        hostNetwork: boolean;
      };
    };
    storageDeviceSets?: DeviceSet[];
    resourceProfile?: ResourceProfile;
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
      reconcileStrategy?: string;
      dbStorageClassName?: string;
      externalPgConfig?: {
        pgSecretName?: string;
        allowSelfSignedCerts?: boolean;
        tlsSecretName?: string;
        enableTls?: boolean;
      };
      dbBackup?: {
        schedule: string;
        volumeSnapshot?: {
          maxSnapshots: number;
          volumeSnapshotClass: string;
        };
      };
      dbRecovery?: {
        volumeSnapshotName: string;
      };
    };
    externalStorage?: {};
    allowRemoteStorageConsumers?: boolean;
    hostNetwork?: boolean;
    forcefulDeployment?: {
      enabled: boolean;
    };
  };
  status?: {
    phase: StorageClusterPhase | string;
    failureDomain?: string;
    failureDomainValues: string[];
    currentMonCount?: number;
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
  deviceClass?: string;
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

type CephDeviceClass = {
  name: string;
};

export type CephHealthCheckType = {
  id: string;
  details: string;
  troubleshootLink?: string;
};

export type CephStatusDetail = {
  message: string;
  severity: string;
};

export type CephClusterKind = K8sResourceCommon & {
  status?: {
    storage?: {
      osd?: {
        storeType?: {
          bluestore?: number;
          'bluestore-rdr'?: number;
        };
      };
      deviceClasses: CephDeviceClass[];
    };
    ceph?: {
      details: Record<string, CephStatusDetail>;
      fsid?: string;
    };
    phase?: string;
  };
};

export enum StorageConsumerState {
  Ready = 'Ready',
  Configuring = 'Configuring',
  Deleting = 'Deleting',
  Failed = 'Failed',
  Disabled = 'Disabled',
}

type StorageConsumerSpec = {
  enable?: boolean;
  storageQuotaInGiB: number;
  storageClasses?: {
    name: string;
  }[];
  volumeSnapshotClasses?: {
    name: string;
  }[];
  volumeGroupSnapshotClasses?: {
    name: string;
  }[];
};

type CephResourcesSpec = {
  kind?: string;
  name?: string;
  status?: string;
  cephClients?: Record<string, string>;
};

type StorageConsumerStatus = {
  state?: StorageConsumerState;
  cephResources?: CephResourcesSpec[];
  lastHeartbeat?: string; // Assuming metav1.Time is a string
  client?: ClientStatus;
  resourceNameMappingConfigMap: {
    name: string;
  };
  onboardingTicketSecret: {
    name: string;
  };
};

type ClientStatus = {
  platformVersion: string;
  operatorVersion: string;
  clusterId: string;
  clusterName: string;
  name: string;
  storageQuotaUtilizationRatio: number;
};

export type StorageConsumerKind = K8sResourceCommon & {
  spec?: StorageConsumerSpec;
  status?: StorageConsumerStatus;
};

export type NoobaaSystemKind = K8sResourceCommon;

export enum CapacityAutoscalingStatus {
  Failed = 'Failed',
  InProgress = 'InProgress',
  Invalid = 'Invalid',
  NotStarted = 'NotStarted',
  Succeeded = 'Succeeded',
}

export type StorageAutoScalerKind = K8sResourceCommon & {
  spec: {
    deviceClass?: string;
    storageCapacityLimit: string;
    storageCluster: {
      name: string;
    };
  };
  status?: {
    error?: {
      message: string;
      timestamp: string;
    };
    lastExpansion?: {
      completionTime?: string;
      startTime?: string;
    };
    phase?: string;
    storageCapacityLimitReached?: boolean;
  };
};

/**
 * Power-of-2 units. See:
 * https://en.wikipedia.org/wiki/Byte#Multiple-byte_units
 */
export enum StorageSizeUnit {
  B = 'B',
  Ki = 'Ki',
  Mi = 'Mi',
  Gi = 'Gi',
  Ti = 'Ti',
}

export enum StorageSizeUnitName {
  B = 'B',
  KiB = 'KiB',
  MiB = 'MiB',
  GiB = 'GiB',
  TiB = 'TiB',
}
