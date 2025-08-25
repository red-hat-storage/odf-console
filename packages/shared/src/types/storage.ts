import { ResourceProfile } from '@odf/core/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

// reference:
// https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go#L964
// https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go#L954
// NamedPoolSpec can refer to both `NamedPoolSpec` (#L964) and `NamedBlockPoolSpec` (#L954)
export type NamedPoolSpec = PoolSpec & {
  name?: string;
};

// reference:
// https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go#L890
export type PoolSpec = {
  failureDomain?: string;
  crushRoot?: string;
  deviceClass?: string;
  enableCrushUpdates?: boolean;
  // @deprecated: use Parameters instead, e.g., parameters["compression_mode"] = "force"
  compressionMode?: string;
  parameters?: Record<string, string>;
  enableRBDStats?: boolean;
  application?: string;
  mirroring?: {
    enabled?: boolean;
  };
  replicated?: {
    // 'size' must be a whole number
    size: number;
    // 'targetSizeRatio' is a decimal percentage value
    targetSizeRatio?: number;
    // 'requireSafeReplicaSize', if false allows you to set replica 1
    requireSafeReplicaSize?: boolean;
    // 'replicasPerFailureDomain', a whole number
    // if set, minimum value should be 1
    replicasPerFailureDomain?: number;
    subFailureDomain?: string;
  };
};

export enum StorageClusterPhase {
  Ready = 'Ready',
  Error = 'Error',
}

// reference:
// https://github.com/red-hat-storage/ocs-operator/blob/main/api/v1/storagecluster_types.go#L143
export type ManagedResources = {
  cephCluster?: {
    monCount?: 3 | 5;
    cephConfig?: Record<string, Record<string, string>>;
  };
  cephBlockPools?: {
    disableSnapshotClass: boolean;
    disableStorageClass: boolean;
    defaultStorageClass?: boolean;
    defaultVirtualizationStorageClass?: boolean;
    poolSpec?: PoolSpec;
  };
  cephFilesystems?: {
    // @deprecated :'disableSnapshotClass' field has been deprecated and will be removed in future.
    disableSnapshotClass?: boolean;
    // @deprecated :'disableStorageClass' field has been deprecated and will be removed in future.
    disableStorageClass?: boolean;
    additionalDataPools?: NamedPoolSpec[];
    metadataPoolSpec?: PoolSpec;
    dataPoolSpec?: PoolSpec;
  };
  cephObjectStores?: {
    hostNetwork: boolean;
    metadataPoolSpec?: PoolSpec;
    dataPoolSpec?: PoolSpec;
  };
};

type LabelSelector = {
  matchLabels?: Record<string, string>;
  matchExpressions?: {
    // required
    key: string;
    // required
    operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
    values?: string[];
  }[];
};

type NodeInclusionPolicy = 'Honor' | 'Ignore';

export type StorageClusterPlacement = {
  nodeAffinity?: any;
  podAffinity?: any;
  podAntiAffinity?: any;
  tolerations?: {
    key?: string;
    operator?: 'Exists' | 'Equal';
    value?: string;
    effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
    tolerationSeconds?: number;
  }[];
  topologySpreadConstraints?: {
    // maxSkew: is a required field. Default value is 1, and 0 is not allowed.
    maxSkew: number;
    // topologyKey: is a required field.
    topologyKey: string;
    // whenUnsatisfiable: is a required field.
    whenUnsatisfiable: 'DoNotSchedule' | 'ScheduleAnyway';
    labelSelector?: LabelSelector;
    minDomains?: number;
    nodeAffinityPolicy?: NodeInclusionPolicy;
    nodeTaintsPolicy?: NodeInclusionPolicy;
    matchLabelKeys?: string[];
  }[];
};

// reference:
// https://github.com/red-hat-storage/ocs-operator/blob/main/api/v1/storagecluster_types.go#L674
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
    placement?: Record<string, StorageClusterPlacement>;
    managedResources?: ManagedResources;
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
    };
    externalStorage?: {};
    allowRemoteStorageConsumers?: boolean;
    hostNetwork?: boolean;
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
