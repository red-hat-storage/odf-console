import { ResourceProfile } from '@odf/core/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

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
    };
    nfs?: {
      enable?: boolean;
    };
    manageNodes?: boolean;
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
      externalPGConfig?: {
        pgSecretName?: string;
        allowSelfSignedCerts?: boolean;
        tlsSecretName?: string;
      };
    };
    externalStorage?: {};
    allowRemoteStorageConsumers?: boolean;
  };
  status?: {
    phase: string;
    failureDomain?: string;
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
};

type ClientStatus = {
  platformVersion: string;
  operatorVersion: string;
};

export type StorageConsumerKind = K8sResourceCommon & {
  spec?: StorageConsumerSpec;
  status: StorageConsumerStatus;
};
