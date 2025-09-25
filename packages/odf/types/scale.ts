import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type FileSystemKind = K8sResourceCommon & {
  spec: {
    remote?: {
      cluster: string;
      fs: string;
    };
    seLinuxOptions?: Record<string, any>;
  };
  status: {
    conditions: [
      {
        type: string;
        status: string;
        lastTransitionTime: string;
        reason: string;
        message: string;
      },
    ];
  };
};

export type ClusterKind = K8sResourceCommon & {
  spec: {
    daemon: {
      hostAliases?: {
        hostname: string;
        ip: string;
      }[];
      clusterProfile?: {
        controlSetxattrImmutableSELinux?: 'yes' | 'no';
        enforceFilesetQuotaOnRoot?: 'yes' | 'no';
        ignorePrefetchLUNCount?: 'yes' | 'no';
        initPrefetchBuffers?: string;
        maxblocksize?: string;
        prefetchPct?: string;
        prefetchTimeout?: string;
      };
      nodeSelector?: {
        'scale.spectrum.ibm.com/daemon-selector'?: string;
      };
      roles: {
        name: string;
        resources?: {
          cpu?: string;
          memory?: string;
        };
      }[];
    };
    grafanaBridge?: Record<string, any>;
    license: {
      accept: boolean;
      license: 'data-access' | 'data-management';
    };
    networkPolicy?: Record<string, any>;
  };
};

export type FilesystemKind = K8sResourceCommon & {
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
    remote: {
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
