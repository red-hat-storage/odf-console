import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type LabelMap = Record<string, string>;

export type IntOrString = number | string;

export type Toleration = {
  key?: string;
  operator?: 'Exists' | 'Equal';
  value?: string;
  effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
  tolerationSeconds?: number;
};

export type ResourceRequirements = {
  cpu?: string;
  memory?: string;
};

export type ContainerResources = {
  limits?: Record<string, IntOrString>;
  requests?: Record<string, IntOrString>;
};

// Scale edition for Cluster license (IBM Spectrum Scale)
export type ScaleEdition = 'data-access' | 'data-management';

// License specifies acceptance and IBM Spectrum Scale edition
export type License = {
  accept: boolean;
  license: ScaleEdition;
};

// KMMImageRegistry defines container image registry details for Kernel Module Management
export type KMMImageRegistry = {
  registry?: string;
  repo?: string;
  registrySecret?: string;
};

// KMMModuleSign specifies Secrets containing signing keys for kernel modules
export type KMMModuleSign = {
  keySecret?: string;
  certSecret?: string;
};

// KernelModuleManagement configures kernel module build via Kernel Module Management Operator
export type KernelModuleManagement = {
  imageRepository?: KMMImageRegistry;
  moduleSigning?: KMMModuleSign;
};

// GPFSModuleManagement specifies how to build GPFS kernel modules (KMM or MCO)
export type GPFSModuleManagement = {
  kmm?: KernelModuleManagement;
};

// CsiContainer identifies a CSI container (driver or sidecar)
export type CsiContainer = 'driver' | 'sidecar';

// CsiContainerResource specifies resources for a CSI container
export type CsiContainerResource = {
  name: CsiContainer;
  resources: {
    limits?: Record<string, string>;
    requests?: Record<string, string>;
  };
};

// SideCar specifies configuration for CSI sidecar pods
export type SideCar = {
  nodeSelector?: LabelMap;
};

// CsiSpec defines Container Storage Interface (CSI) configuration
export type CsiSpec = {
  sidecar?: SideCar;
  containerResources?: CsiContainerResource[];
};

// NetworkPolicyConfig holds network policy options (empty for now)
export type NetworkPolicyConfig = Record<string, never>;

// DebugConfig holds configuration for debugging functionality
export type DebugConfig = {
  threadDeadlockCapture?: boolean;
};

// ClusterCondition is the observed state condition (metav1.Condition)
export type ClusterCondition = {
  lastTransitionTime: string;
  message: string;
  observedGeneration?: number;
  reason: string;
  status: 'True' | 'False' | 'Unknown';
  type: string;
};

// ClusterStatus defines the observed state of Cluster
export type ClusterStatus = {
  conditions?: ClusterCondition[];
};

// ClusterSpec defines the desired state of Cluster (matches Go ClusterSpec)
export type ClusterSpec = {
  license: License;
  daemon?: DaemonUserSpec;
  gui?: GuiSpec;
  pmcollector?: PmcollectorSpec;
  grafanaBridge?: GrafanaBridgeSpec;
  networkPolicy?: NetworkPolicyConfig;
  csi?: CsiSpec;
  debugConfig?: DebugConfig;
  gpfsModuleManagement?: GPFSModuleManagement;
};

// DaemonUserSpec tells the operator how to configure gpfs daemons
export type DaemonUserSpec = {
  clusterNameOverride?: string;
  hostAliases?: {
    hostname: string;
    ip: string;
  }[];
  nodeSelector?: LabelMap;
  nodeSelectorExpressions?: {
    key: string;
    operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist' | 'Gt' | 'Lt';
    values?: string[];
  }[];
  tolerations?: Toleration[];
  nsdDevicesConfig?: {
    bypassDiscovery?: boolean;
    localDevicePaths?: {
      devicePath?: string;
      deviceType?: string;
    }[];
  };
  update?: {
    maxUnavailable?: IntOrString;
    paused?: boolean;
    pools?: {
      name: string;
      maxUnavailable?: IntOrString;
      paused?: boolean;
      nodeSelector?: {
        matchLabels?: LabelMap;
        matchExpressions?: {
          key: string;
          operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
          values?: string[];
        }[];
      };
    }[];
  };
  clusterProfile?: {
    verbsRdma?: 'enable' | 'disable';
    verbsRdmaSend?: 'yes' | 'no';
    verbsRdmaCm?: 'enable' | 'disable';
    proactiveReconnect?: 'yes' | 'no';
    ignoreReplicationForQuota?: 'yes' | 'no';
    ignoreReplicationOnStatfs?: 'yes' | 'no';
    readReplicaPolicy?: 'default' | 'local' | 'fastest';
    traceGenSubDir?: '/var/mmfs/tmp/traces';
    cloudEnv?: 'general';
    [key: string]: string | undefined;
  };
  roles?: {
    name: 'afm' | 'storage' | 'client';
    limits?: ResourceRequirements;
    resources?: ResourceRequirements;
    profile?: {
      verbsRdma?: 'enable' | 'disable';
      verbsRdmaSend?: 'yes' | 'no';
      proactiveReconnect?: 'yes' | 'no';
      [key: string]: string | undefined;
    };
  }[];
  nodeProfiles?: { name: string }[]; // nodeProfiles and roles cannot both be set; roles is deprecated
};

// GuiSpec tells the operator how to configure the GUIs (default: enableSessionIPCheck: true)
export type GuiSpec = {
  enableSessionIPCheck?: boolean;
  nodeSelector?: LabelMap;
  tolerations?: Toleration[];
  containerResources?: {
    name: 'liberty' | 'postgres';
    resources: ContainerResources;
  }[];
};

// PmcollectorSpec tells the operator how to configure pmcollectors
export type PmcollectorSpec = {
  nodeSelector?: LabelMap;
  storageClass?: string;
  tolerations?: Toleration[];
  pmcollectorContainerResources?: {
    name: 'sysmon' | 'pmcollector';
    resources: ContainerResources;
  }[];
};

// GrafanaBridgeSpec tells the operator how to configure Grafana Bridge
export type GrafanaBridgeSpec = {
  enablePrometheusExporter?: boolean;
  nodeSelector?: LabelMap;
  tolerations?: Toleration[];
};

export type ClusterKind = K8sResourceCommon & {
  spec: ClusterSpec;
  status?: ClusterStatus;
};

export type FileSystemKind = K8sResourceCommon & {
  apiVersion: 'scale.spectrum.ibm.com/v1beta1';
  kind: 'Filesystem';
  spec: {
    local?: {
      blockSize?:
        | '64k'
        | '128k'
        | '256k'
        | '512k'
        | '1m'
        | '2m'
        | '4m'
        | '8m'
        | '16m'
        | '64K'
        | '128K'
        | '256K'
        | '512K'
        | '1M'
        | '2M'
        | '4M'
        | '8M'
        | '16M';
      pools: {
        name?: string; // default: "system"
        disks: string[];
      }[];
      replication: '1-way' | '2-way' | '3-way';
      type: 'shared' | 'unshared';
    };
    remote?: {
      cluster: string;
      fs: string;
    };
    seLinuxOptions?: {
      level?: string;
      role?: string;
      type?: string;
      user?: string;
    };
    vdiskNSD?: {
      replication?: '1-way' | '2-way';
      tiebreaker?: {
        device: string;
        nodeDaemonName: string;
      };
      vdiskSets?: {
        blockSize?:
          | '256k'
          | '512k'
          | '1m'
          | '2m'
          | '4m'
          | '8m'
          | '16m'
          | '256K'
          | '512K'
          | '1M'
          | '2M'
          | '4M'
          | '8M'
          | '16M';
        declusteredArray?: string; // default: "DA1"
        failureGroup?: number; // 1–100
        nsdUsage?: 'dataAndMetadata' | 'metadataOnly' | 'dataOnly';
        raidCode?:
          | '3WayReplication'
          | '4WayReplication'
          | '4+2P'
          | '4+3P'
          | '8+2P'
          | '8+3P';
        recoveryGroups?: string[];
        setSize?: string; // regex validated in CRD
        storagePool?: string;
      }[];
    };
  };
  status?: {
    conditions?: {
      lastTransitionTime: string; // date-time
      message: string;
      observedGeneration?: number;
      reason: string;
      status: 'True' | 'False' | 'Unknown';
      type: string;
    }[];
    maintenanceMode?: 'enabled' | 'disabled' | 'unknown' | 'not supported';
    pools?: {
      name?: string;
      diskCount?: number;
      disks?: string;
      totalDiskSize?: string;
      failureGroups?: {
        diskCount?: number;
        disks?: string;
        failureGroup?: string;
        totalDiskSize?: string;
      }[];
    }[];
    seLinuxOptions?: {
      level?: string;
      role?: string;
      type?: string;
      user?: string;
    };
    uid?: string;
    version?: string;
  };
};

export type RemoteClusterKind = K8sResourceCommon & {
  apiVersion: 'scale.spectrum.ibm.com/v1beta1';
  kind: 'RemoteCluster';
  spec: {
    gui: {
      secretName: string;
      port?: number; // default: 443
      cacert?: string;
      scheme?: 'https'; // default: https
      host?: string; // DEPRECATED
      hosts?: string[]; // max 3 items
      csiSecretName?: string;
      insecureSkipVerify?: boolean;
      passwordRotation?: {
        passwordChangeInterval?: string; // default: "80"
      };
    };
    contactNodes?: string[];
  };
  status?: {
    conditions?: {
      lastTransitionTime: string; // date-time
      message: string;
      observedGeneration?: number;
      reason: string;
      status: 'True' | 'False' | 'Unknown';
      type: string;
    }[];
    guiVersion?: string;
    lastPasswordChange?: string;
    localKeySHADigest: string;
    remoteKeySHADigest: string;
  };
};

export type EncryptionConfigKind = K8sResourceCommon & {
  spec: {
    port?: number; // default: 9443
    cacert?: string; // ConfigMap name
    server: string;
    filesystems?: {
      name: string;
      algorithm?: 'DEFAULTNISTSP800131A' | 'DEFAULTNISTSP800131AFAST';
    }[];
    tenant: string; // maxLength: 16
    client: string; // maxLength: 16
    backupServers?: string[]; // maxItems: 5
    remoteRKM?: string; // maxLength: 21
    secret: string; // Secret name containing username/password
  };
  status?: {
    conditions?: {
      lastTransitionTime: string;
      message: string;
      observedGeneration?: number;
      reason: string;
      status: 'True' | 'False' | 'Unknown';
      type: string;
    }[];
    rkmId?: string;
  };
};

export type GetDevicefinderResponse = {
  devices: {
    [nodeName: string]: {
      discoveredDevices: Array<{
        path: string;
        type: string;
        size: number;
        WWN: string;
      }>;
    };
  };
};

export type DaemonKind = K8sResourceCommon & {
  spec?: {
    /**
     * clusterName overrides the default name, which is that of the Daemon resource itself postpended with any resolved domain suffix.
     */
    clusterNameOverride?: string;
    /**
     * IBM Spectrum Scale configuration parameters for the cluster.
     * Changing these values is unsupported and should
     * not be changed unless advised by IBM Support
     */
    clusterProfile?: {
      afmAsyncDelay?: string;
      afmDIO?: string;
      afmHashVersion?: string;
      afmMaxParallelRecoveries?: string;
      afmObjKeyExpiration?: string;
      backgroundSpaceReclaimThreshold?: string;
      cloudEnv?: 'general';
      controlSetxattrImmutableSELinux?: string;
      encryptionKeyCacheExpiration?: string;
      enforceFilesetQuotaOnRoot?: string;
      ignorePrefetchLUNCount?: string;
      ignoreReplicaSpaceOnStat?: 'yes' | 'no';
      ignoreReplicationForQuota?: 'yes' | 'no';
      ignoreReplicationOnStatfs?: 'yes' | 'no';
      initPrefetchBuffers?: string;
      maxBufferDescs?: string;
      maxMBpS?: string;
      maxTcpConnsPerNodeConn?: string;
      maxblocksize?: string;
      nsdMaxWorkerThreads?: string;
      nsdMinWorkerThreads?: string;
      nsdMultiQueue?: string;
      nsdRAIDBlockDeviceMaxSectorsKB?: string;
      nsdRAIDBlockDeviceNrRequests?: string;
      nsdRAIDBlockDeviceQueueDepth?: string;
      nsdRAIDBlockDeviceScheduler?: string;
      nsdRAIDBufferPoolSizePct?: string;
      nsdRAIDDefaultGeneratedFD?: string;
      nsdRAIDDiskCheckVWCE?: string;
      nsdRAIDEventLogToConsole?: string;
      nsdRAIDFlusherFWLogHighWatermarkMB?: string;
      nsdRAIDMasterBufferPoolSize?: string;
      nsdRAIDMaxPdiskQueueDepth?: string;
      nsdRAIDMaxRecoveryRetries?: string;
      nsdRAIDMaxTransientStale2FT?: string;
      nsdRAIDMaxTransientStale3FT?: string;
      nsdRAIDNonStealableBufPct?: string;
      nsdRAIDReadRGDescriptorTimeout?: string;
      nsdRAIDReconstructAggressiveness?: string;
      nsdRAIDSmallThreadRatio?: string;
      nsdRAIDThreadsPerQueue?: string;
      nsdRAIDTracks?: string;
      nsdSmallThreadRatio?: string;
      nspdBufferMemPerQueue?: string;
      nspdQueues?: string;
      nspdThreadsPerQueue?: string;
      numaMemoryInterleave?: string;
      pagepoolMaxPhysMemPct?: string;
      panicOnIOHang?: string;
      pitWorkerThreadsPerNode?: string;
      prefetchPct?: string;
      prefetchThreads?: string;
      prefetchTimeout?: string;
      proactiveReconnect?: 'yes' | 'no';
      qMaxBlockShare?: string;
      qRevokeDisable?: string;
      readReplicaPolicy?: 'default' | 'local' | 'fastest';
      seqDiscardThreshold?: string;
      traceGenSubDir?: '/var/mmfs/tmp/traces';
      tscCmdAllowRemoteConnections?: 'yes' | 'no';
      tscCmdPortRange?: string;
      verbsPorts?: string;
      verbsRdma?: 'enable' | 'disable';
      verbsRdmaCm?: 'enable' | 'disable';
      verbsRdmaSend?: 'yes' | 'no';
    };
    /**
     * It specifies the IBM Spectrum Scale edition, "data-access" or "data-management".
     */
    edition: 'data-access' | 'data-management' | 'erasure-code';
    /**
     * hostAliases that will be added to the internal DNS that resolves hosts for core pods
     */
    hostAliases?: {
      /**
       * Hostname for the associated IP address.
       */
      hostname: string;
      /**
       * IP address of the host file entry.
       */
      ip: string;
    }[];
    /**
     * Deprecated: use ClusterManagerConfigSpec.Spec.Images instead.
     * core and init image pair that daemon will use with respect to edition specified by user
     */
    images?: {
      core?: string;
      coreInit?: string;
    };
    /**
     * nodeSelector will be applied to daemon core pods. The selectors in this field are ANDed.
     * This means that only nodes are selected which have all labels of this field.
     * This field is logically ANDed with any nodeSelectorExpressions also configured.
     */
    nodeSelector?: {
      [k: string]: string;
    };
    /**
     * nodeSelectorExpressions that will apply to daemon core pods. This field is logically ANDed with any nodeSelector also configured.
     */
    nodeSelectorExpressions?: {
      /**
       * The label key that the selector applies to.
       */
      key: string;
      /**
       * Represents a key's relationship to a set of values.
       * Valid operators are In, NotIn, Exists, DoesNotExist. Gt, and Lt.
       */
      operator: string;
      /**
       * An array of string values. If the operator is In or NotIn,
       * the values array must be non-empty. If the operator is Exists or DoesNotExist,
       * the values array must be empty. If the operator is Gt or Lt, the values
       * array must have a single element, which will be interpreted as an integer.
       * This array is replaced during a strategic merge patch.
       */
      values?: string[];
    }[];
    /**
     * nsdDevicesConfig allows users to specify non-standard device names in order to override or enhance the disk discovery process.
     * This parameter must only be specified when using a local filesystem with devices that use non-standard device names.
     */
    nsdDevicesConfig?: {
      /**
       * bypassDiscovery allows bypass of automatic disk discovery. If set to true, only the set of devices
       * defined by the localDevicePaths will be used. If set to false, the automatic device discovery will find
       * devices with standard device names.
       */
      bypassDiscovery?: true | false;
      /**
       * localDevicePaths specifies the device names and device types.
       */
      localDevicePaths?: {
        /**
         * devicePath specifies nsd device names. Allows wildcards.
         * For example: '/dev/sdd', '/dev/pvc*', ...
         */
        devicePath?: string;
        /**
         * deviceType specifies the device type.
         * For example: 'dmm', 'vpath', 'generic', ...
         */
        deviceType?: string;
      }[];
    };
    /**
     * regionalDR contains daemon configuration information for regionaldr
     */
    regionalDR?: {};
    /**
     * roles specify the IBM Spectrum Scale configuration parameters for nodes that apply to a role.
     * Specifying configuration parameters for roles is optional and does overwrite a set of default parameters.
     */
    roles?: {
      /**
       * The Memory/CPU resource limits that will be set for Scale core pods.
       */
      limits?: {
        /**
         * CPU is measured in cpu units (i.e 1, 2, 100m, 2500m)
         */
        cpu?: string;
        /**
         * Memory is measured in bytes as plain integer or with kubernetes supported suffixes (i.e 128974848, 129e6, 129M, 123Mi).
         * The value is the maximum amount of memory the Scale core pod is allowed to consume.
         */
        memory?: string;
      };
      /**
       * Name of the role. Only afm, storage or client are allowed.
       */
      name?: 'afm' | 'storage' | 'client';
      /**
       * IBM Spectrum Scale node-scoped configuration parameters.
       * Changing these values is unsupported and should
       * not be changed unless advised by IBM Support
       */
      profile?: {
        afmMaxParallelRecoveries?: string;
        backgroundSpaceReclaimThreshold?: string;
        controlSetxattrImmutableSELinux?: string;
        ignorePrefetchLUNCount?: string;
        initPrefetchBuffers?: string;
        maxBufferDescs?: string;
        maxMBpS?: string;
        maxTcpConnsPerNodeConn?: string;
        maxblocksize?: string;
        nsdMaxWorkerThreads?: string;
        nsdMinWorkerThreads?: string;
        nsdMultiQueue?: string;
        nsdRAIDBlockDeviceMaxSectorsKB?: string;
        nsdRAIDBlockDeviceNrRequests?: string;
        nsdRAIDBlockDeviceQueueDepth?: string;
        nsdRAIDBlockDeviceScheduler?: string;
        nsdRAIDBufferPoolSizePct?: string;
        nsdRAIDDefaultGeneratedFD?: string;
        nsdRAIDDiskCheckVWCE?: string;
        nsdRAIDEventLogToConsole?: string;
        nsdRAIDFlusherFWLogHighWatermarkMB?: string;
        nsdRAIDMasterBufferPoolSize?: string;
        nsdRAIDMaxPdiskQueueDepth?: string;
        nsdRAIDMaxRecoveryRetries?: string;
        nsdRAIDMaxTransientStale2FT?: string;
        nsdRAIDMaxTransientStale3FT?: string;
        nsdRAIDNonStealableBufPct?: string;
        nsdRAIDReadRGDescriptorTimeout?: string;
        nsdRAIDReconstructAggressiveness?: string;
        nsdRAIDSmallThreadRatio?: string;
        nsdRAIDThreadsPerQueue?: string;
        nsdRAIDTracks?: string;
        nsdSmallThreadRatio?: string;
        nspdBufferMemPerQueue?: string;
        nspdQueues?: string;
        nspdThreadsPerQueue?: string;
        numaMemoryInterleave?: string;
        pagepoolMaxPhysMemPct?: string;
        panicOnIOHang?: string;
        pitWorkerThreadsPerNode?: string;
        prefetchPct?: string;
        prefetchThreads?: string;
        prefetchTimeout?: string;
        proactiveReconnect?: 'yes' | 'no';
        seqDiscardThreshold?: string;
        tscCmdPortRange?: string;
        verbsPorts?: string;
        verbsRdma?: 'enable' | 'disable';
        verbsRdmaCm?: 'enable' | 'disable';
        verbsRdmaSend?: 'yes' | 'no';
      };
      /**
       * The Memory/CPU resource requests that will be set for Scale core pods.
       */
      resources?: {
        /**
         * CPU is measured in cpu units (i.e 1, 2, 100m, 2500m)
         */
        cpu?: string;
        /**
         * Memory is measured in bytes as plain integer or with kubernetes supported suffixes (i.e 128974848, 129e6, 129M, 123Mi).
         * The value is a target and will be requested for Scale core pods.
         * Resource request limits on containers impact pod scheduling and bin packing.
         */
        memory?: string;
      };
    }[];
    /**
     * Specifies the site name and zone for daemon name resolution.
     */
    site: {
      /**
       * name is the site name.
       */
      name: string;
      /**
       * zone is the domain name that IBM Spectrum Scale DNS records for this site will be managed.
       * This will be used to resolve node names for IBM Spectrum Scale.
       */
      zone: string;
    };
    /**
     * tolerations that are applied to daemon core pods.
     */
    tolerations?: {
      /**
       * Effect indicates the taint effect to match. Empty means match all taint effects.
       * When specified, allowed values are NoSchedule, PreferNoSchedule and NoExecute.
       */
      effect?: string;
      /**
       * Key is the taint key that the toleration applies to. Empty means match all taint keys.
       * If the key is empty, operator must be Exists; this combination means to match all values and all keys.
       */
      key?: string;
      /**
       * Operator represents a key's relationship to the value.
       * Valid operators are Exists and Equal. Defaults to Equal.
       * Exists is equivalent to wildcard for value, so that a pod can
       * tolerate all taints of a particular category.
       */
      operator?: string;
      /**
       * TolerationSeconds represents the period of time the toleration (which must be
       * of effect NoExecute, otherwise this field is ignored) tolerates the taint. By default,
       * it is not set, which means tolerate the taint forever (do not evict). Zero and
       * negative values will be treated as 0 (evict immediately) by the system.
       */
      tolerationSeconds?: number;
      /**
       * Value is the taint value the toleration matches to.
       * If the operator is Exists, the value should be empty, otherwise just a regular string.
       */
      value?: string;
    }[];
    /**
     * update defines the update behavior of the Scale core pods. If not specified, all core pods are updated one by one.
     */
    update?: {
      /**
       * maxUnavailable defines either an integer number or percentage of core pods
       * and nodes that can go Unavailable during an update. This only affects core
       * pods that do not reside in any update pool (see `pools` parameter).
       * The default value is 1. A value larger than 1 will mean multiple core pods
       * and nodes going unavailable during the update, which causes that PV storage
       * of Storage Scale CSI is unavailable and may affect your workload stress on
       * the remaining nodes. You cannot set this value to 0 to stop updates;
       * to stop updates, use the 'paused' property instead.
       */
      maxUnavailable?: number | string;
      /**
       * paused specifies whether or not updates should be stopped. This only affects
       * core pods that do not reside in any update pool (see `pools` parameter).
       */
      paused?: boolean;
      /**
       * pools describe a set of update pools. An update pool describes the update
       * behavior of selected core pods, for example how many pods can be updated in
       * parallel.
       */
      pools?: {
        /**
         * maxUnavailable defines either an integer number or percentage of core pods
         * and nodes in the pool that can go Unavailable during an update.
         * The default value is 1. A value larger than 1 will mean multiple core pods
         * and nodes going unavailable during the update, which causes that PV storage
         * of Storage Scale CSI is unavailable and may affect your workload stress on
         * the remaining nodes. You cannot set this value to 0 to stop updates;
         * to stop updates, use the 'paused' property instead.
         * This parameter must not be specified if the update pool references to an
         * Openshift MachineConfigPool (means pool name has "mcp/" prefix).
         */
        maxUnavailable?: number | string;
        /**
         * name is the name of the update pool. This pool references to an OpenShift
         * MachineConfigPool if the name has a "mcp/" prefix (for example "mcp/worker").
         */
        name: string;
        /**
         * nodeSelector selects the Kubernetes nodes that host the core pods that belong
         * to this update pool. Nodes that do not host a core pod are ignored.
         * This parameter must not be specified if the update pool references to an
         * Openshift MachineConfigPool (means pool name has "mcp/" prefix).
         */
        nodeSelector?: {
          /**
           * matchExpressions is a list of label selector requirements. The requirements are ANDed.
           */
          matchExpressions?: {
            /**
             * key is the label key that the selector applies to.
             */
            key: string;
            /**
             * operator represents a key's relationship to a set of values.
             * Valid operators are In, NotIn, Exists and DoesNotExist.
             */
            operator: string;
            /**
             * values is an array of string values. If the operator is In or NotIn,
             * the values array must be non-empty. If the operator is Exists or DoesNotExist,
             * the values array must be empty. This array is replaced during a strategic
             * merge patch.
             */
            values?: string[];
          }[];
          /**
           * matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
           * map is equivalent to an element of matchExpressions, whose key field is "key", the
           * operator is "In", and the values array contains only "value". The requirements are ANDed.
           */
          matchLabels?: {
            [k: string]: string;
          };
        };
        /**
         * paused specifies whether or not updates to this update pool should be stopped.
         * This parameter is ignored if the update pool references to an Openshift
         * MachineConfigPool (means pool name has "mcp/" prefix).
         */
        paused?: boolean;
      }[];
    };
  };
  /**
   * status defines the observed state of Daemon
   */
  status?: {
    /**
     * ID representing GPFS cluster
     */
    clusterID?: string;
    /**
     * Name of GPFS cluster
     */
    clusterName?: string;
    conditions?: {
      /**
       * lastTransitionTime is the last time the condition transitioned from one status to another.
       * This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.
       */
      lastTransitionTime: string;
      /**
       * message is a human readable message indicating details about the transition.
       * This may be an empty string.
       */
      message: string;
      /**
       * observedGeneration represents the .metadata.generation that the condition was set based upon.
       * For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
       * with respect to the current state of the instance.
       */
      observedGeneration?: number;
      /**
       * reason contains a programmatic identifier indicating the reason for the condition's last transition.
       * Producers of specific condition types may define expected values and meanings for this field,
       * and whether the values are considered a guaranteed API.
       * The value should be a CamelCase string.
       * This field may not be empty.
       */
      reason: string;
      /**
       * status of the condition, one of True, False, Unknown.
       */
      status: 'True' | 'False' | 'Unknown';
      /**
       * type of condition in CamelCase or in foo.example.com/CamelCase.
       * ---
       * Many .condition.type values are consistent across resources like Available, but because arbitrary conditions can be
       * useful (see .node.status.conditions), the ability to deconflict is important.
       * The regex it matches is (dns1123SubdomainFmt/)?(qualifiedNameFmt)
       */
      type: string;
    }[];
    /**
     * Details about nodes that are cordoned and drained and pods that are evicted by Scale operator.
     */
    cordonAndDrain?: {
      /**
       * List of nodes that are cordoned by Scale operator. These nodes have status SchedulingDisabled. Nodes that are cordoned by third party like machine config operator are not listed.
       */
      nodesCordonedByOperator: string;
      /**
       * List of nodes that are cordoned by third party like machine config operator. These nodes have status SchedulingDisabled. Nodes that are cordoned by Scale operator are not listed.
       */
      nodesCordonedByOthers: string;
      /**
       * List of nodes on which the Scale operator is currently evicting pods
       */
      nodesDraining?: {
        /**
         * The node that is currently drained by the Scale operator
         */
        node: string;
        /**
         * The pods that the Scale operator is currently evicting
         */
        ongoingPodEvictions: string[];
        /**
         * The pods that failed to evict. The Scale operator continues to try to evict these pods.
         */
        podEvictionsFailed: string[];
      }[];
      /**
       * List of daemon core pod evictions that are requested by third party (like machine config operator).
       */
      podEvictionRequests?: {
        /**
         * Scale core pods that has been requested for eviction.
         */
        pods: string;
        /**
         * Name of requestor that requests the eviction of the pod.
         */
        requestor: string;
      }[];
    };
    /**
     * The currently enabled level of functionality of the cluster. It is expressed as an IBM Spectrum Scale version number, such as 5.0.2.0.
     */
    minimumReleaseLevel?: string;
    pods?: {
      /**
       * Number of desired core pods
       */
      desired: string;
      /**
       * Number of existing core pods
       */
      total: string;
    };
    podsStatus?: {
      /**
       * Number of running core pods
       */
      running: string;
      /**
       * Number of starting core pods
       */
      starting: string;
      /**
       * Number of terminating core pods
       */
      terminating: string;
      /**
       * Number of core pods with unknown status. Pods scheduled on unreachable nodes are listed here.
       */
      unknown: string;
      /**
       * Number of core pods that will be deleted
       */
      waitingForDelete: string;
    };
    quorumPods?: {
      /**
       * Number of running quorum pods
       */
      running: string;
      /**
       * Total number of quorum pods
       */
      total: string;
    };
    roles?: {
      /**
       * Name of the role
       */
      name: string;
      /**
       * Number of nodes that that are assigned to this role. Nodes are assigned to a role by label, i.e. "scale.spectrum.ibm.com/role=client"
       */
      nodeCount: string;
      /**
       * List of nodes that are assigned to the role
       */
      nodes: string;
      /**
       * Number of role pods
       */
      podCount: string;
      /**
       * List of role pods
       */
      pods: string;
      /**
       * Number of running role pods
       */
      runningCount: string;
    }[];
    statusDetails?: {
      /**
       * List of core pod nodes that are currently rebooting
       */
      nodesRebooting: string;
      /**
       * List of core pod nodes that are unreachable
       */
      nodesUnreachable: string;
      /**
       * List of starting core pods
       */
      podsStarting: string;
      /**
       * List of terminating core pods
       */
      podsTerminating: string;
      /**
       * List of core pods with unknown status. Pods scheduled on unreachable nodes are listed here.
       */
      podsUnknown: string;
      /**
       * List of core pods that will be deleted soon
       */
      podsWaitingToBeDeleted?: {
        /**
         * Reason for deleting the core pods
         */
        deleteReason: string;
        /**
         * List of core pods that will be deleted soon
         */
        pods: string;
      }[];
      /**
       * List of pods that act as quorum node for Spectrum Scale
       */
      quorumPods: string;
    };
    tiebreaker?: {
      version?: string;
    };
    update?: {
      pools?: {
        name: string;
        nodeCount: number;
        nodes: string;
      }[];
    };
    /**
     * Details about version of each node in IBM Spectrum Scale cluster. It contains the version of nodes in the other site if it's a stretch cluster.
     */
    versions?: {
      /**
       * Number of pods that that have this version
       */
      count: string;
      /**
       * List of pods that have this version
       */
      pods?: string;
      /**
       * The site name in a stretch cluster environment
       */
      site?: string;
      /**
       * Value of the pod's product version (expected format is x.x.x.x or "unavailable" if pod is unavailable)
       */
      version: string;
    }[];
  };
};

export type LabelSelectorRequirement = {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
};

export type LabelSelector = {
  matchLabels?: LabelMap;
  matchExpressions?: LabelSelectorRequirement[];
};

export type Condition = {
  lastTransitionTime: string; // RFC3339 date-time
  message: string;
  observedGeneration?: number;
  reason: string;
  status: 'True' | 'False' | 'Unknown';
  type: string;
};

export type LocalDiskKind = K8sResourceCommon & {
  spec: {
    /** Device path at creation time (e.g. /dev/sdb) */
    device: string;

    /** Kubernetes node name where the device path was discovered */
    node: string;

    /** Skip verification of existing Spectrum Scale data */
    existingDataSkipVerify?: boolean;

    /** Failure group number (stringified integer) */
    failureGroup?: string;

    /**
     * Selects nodes expected to have physical access to the disk.
     * Must not be set for unshared disks.
     */
    nodeConnectionSelector?: LabelSelector;

    /** Space reclaim disk type */
    thinDiskType?: 'no' | 'nvme' | 'scsi' | 'auto';
  };

  status?: {
    conditions?: Condition[];

    /** Assigned failure group number */
    failuregroup: string;

    /** Mapping target for automatic failure group assignment */
    failuregroupMapping?: string;

    /** Filesystem using this disk (empty if unused) */
    filesystem: string;

    /** Nodes that have a physical connection to the disk */
    nodeConnections: string;

    /** Filesystem pool using this disk (empty if unused) */
    pool: string;

    /** Size of the local disk */
    size: string;

    /**
     * Disk connectivity type
     * - shared
     * - partially-shared
     * - unshared
     */
    type: 'shared' | 'partially-shared' | 'unshared';
  };
};

export type DiscoveredDevice = {
  path: string;
  type: string;
  size: number;
  WWN: string;
  nodeName: string;
};
