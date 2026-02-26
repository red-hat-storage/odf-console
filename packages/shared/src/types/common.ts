import {
  PrometheusResponse,
  K8sResourceCommon,
  FirehoseResult,
  SubsystemHealth,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';

export type HumanizeResult = {
  value: number;
  unit: string;
  string: string;
};

export enum InfraProviders {
  AWS = 'AWS',
  Azure = 'Azure',
  BareMetal = 'BareMetal',
  GCP = 'GCP',
  IBMCloud = 'IBMCloud',
  None = 'None',
  OpenStack = 'OpenStack',
  OVirt = 'oVirt',
  KubeVirt = 'KubeVirt',
  VSphere = 'VSphere',
}

export type InfrastructureKind = K8sResourceCommon & {
  apiVersion: 'config.openshift.io/v1';
  kind: 'Infrastructure';
  spec: {
    platformSpec: {
      type: InfraProviders;
    };
  };
  status?: {
    platform: InfraProviders;
  };
};

export type K8sResourceCondition = {
  type: string;
  status: keyof typeof K8sResourceConditionStatus;
  lastTransitionTime?: string;
  reason?: string;
  message?: string;
};

export enum K8sResourceConditionStatus {
  True = 'True',
  False = 'False',
  Unknown = 'Unknown',
}

export type PrometheusHealthHandler = (
  responses: {
    response: PrometheusResponse;
    error: any;
  }[],
  t?: TFunction,
  additionalResource?: FirehoseResult<K8sResourceCommon | K8sResourceCommon[]>
) => SubsystemHealth;

export type RowFunctionArgs<T = any, C = any> = {
  obj: T;
  columns: any[];
  customData?: C;
};

export type StorageClass = K8sResourceCommon & {
  provisioner: string;
  parameters: object;
  reclaimPolicy?: string;
  volumeBindingMode?: string;
  allowVolumeExpansion?: boolean;
};

export type CRDVersion = {
  name: string;
  served: boolean;
  storage: boolean;
  schema: {
    openAPIV3Schema: any;
  };
};

export type CustomResourceDefinitionKind = {
  spec: {
    group: string;
    versions: CRDVersion[];
    names: {
      kind: string;
      singular: string;
      plural: string;
      listKind: string;
      shortNames?: string[];
    };
    scope: 'Cluster' | 'Namespaced';
  };
  status?: {
    conditions?: K8sResourceCondition[];
  };
} & K8sResourceCommon;

export type ImageRegistryConfigStorageS3 = {
  bucket?: string;
  region?: string;
  regionEndpoint?: string;
  chunkSizeMiB?: number;
  encrypt?: boolean;
  keyID?: string;
  virtualHostedStyle?: boolean;
};

export type ImageRegistryConfigStoragePVC = {
  claim?: string;
};

export type ImageRegistryConfigStorageGCS = {
  bucket?: string;
  region?: string;
  projectID?: string;
  keyID?: string;
};

export type ImageRegistryConfigStorageSwift = {
  authURL?: string;
  authVersion?: string;
  container?: string;
  domain?: string;
  domainID?: string;
  tenant?: string;
  tenantID?: string;
  regionName?: string;
};

export type ImageRegistryConfigStorageAzure = {
  accountName?: string;
  container?: string;
  cloudName?: string;
  networkAccess?: {
    type?: 'Internal' | 'External';
    internal?: {
      networkResourceGroupName?: string;
      vnetName?: string;
      subnetName?: string;
      privateEndpointName?: string;
    };
  };
};

export type ImageRegistryConfigStorageIBMCOS = {
  bucket?: string;
  location?: string;
  resourceGroupName?: string;
  resourceKeyCRN?: string;
  serviceInstanceCRN?: string;
};

export type ImageRegistryConfigStorageAlibabaOSS = {
  bucket?: string;
  region?: string;
  endpointAccessibility?: 'Internal' | 'Public';
  encryption?: {
    method?: 'AES256' | 'KMS';
    kms?: {
      keyID: string;
    };
  };
};

export type ImageRegistryConfigProxy = {
  http?: string;
  https?: string;
  noProxy?: string;
};

export type ImageRegistryConfigRequests = {
  read?: ImageRegistryConfigRequestsLimits;
  write?: ImageRegistryConfigRequestsLimits;
};

export type ImageRegistryConfigRequestsLimits = {
  maxRunning?: number;
  maxInQueue?: number;
  maxWaitInQueue?: string;
};

export type ImageRegistryConfigRoute = {
  name: string;
  hostname?: string;
  secretName?: string;
};

export type ImageRegistryConfigStorage = {
  emptyDir?: {};
  s3?: ImageRegistryConfigStorageS3;
  gcs?: ImageRegistryConfigStorageGCS;
  swift?: ImageRegistryConfigStorageSwift;
  pvc?: ImageRegistryConfigStoragePVC;
  azure?: ImageRegistryConfigStorageAzure;
  ibmcos?: ImageRegistryConfigStorageIBMCOS;
  oss?: ImageRegistryConfigStorageAlibabaOSS;

  managementState?: 'Managed' | 'Unmanaged';
};

export type ImageRegistrySpec = {
  managementState?: 'Managed' | 'Unmanaged' | 'Removed';
  logLevel?: string;
  operatorLogLevel?: string;

  httpSecret?: string;
  proxy?: ImageRegistryConfigProxy;
  storage?: ImageRegistryConfigStorage;

  readOnly?: boolean;
  disableRedirect?: boolean;

  requests?: ImageRegistryConfigRequests;

  defaultRoute?: boolean;
  routes?: ImageRegistryConfigRoute[];
  replicas: number;
  logging?: number;
  resources?: any;
  nodeSelector?: Record<string, string>;
  tolerations?: any[];
  rolloutStrategy?: 'RollingUpdate' | 'Recreate';
  affinity?: any;
  topologySpreadConstraints?: any[];
};

export type ImageRegistryStatus = {
  storageManaged: boolean;
  storage: ImageRegistryConfigStorage;
  conditions?: any[];
  readyReplicas?: number;
};

export type ImageRegistryConfigKind = {
  spec: ImageRegistrySpec;
  status?: ImageRegistryStatus;
} & K8sResourceCommon;
