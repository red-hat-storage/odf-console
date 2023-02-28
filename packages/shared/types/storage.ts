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
    externalStorage?: {};
    security?: {
      kms?: {
        enableKeyRotation: boolean;
        schedule: string;
      };
    };
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
    storage: {
      deviceClasses: CephDeviceClass[];
    };
    ceph?: {
      fsid?: string;
    };
    phase?: string;
  };
};
