import { StorageClusterResource, ResourceConstraints } from '@odf/shared/types';

export enum BackingStorageType {
  EXISTING = 'existing',
  LOCAL_DEVICES = 'local-devices',
  EXTERNAL = 'external',
}

export enum DeploymentType {
  FULL = 'Full deployment',
  MCG = 'MultiCloud Object Gateway',
}

export enum ValidationType {
  'MINIMAL' = 'MINIMAL',
  'INTERNALSTORAGECLASS' = 'INTERNALSTORAGECLASS',
  'BAREMETALSTORAGECLASS' = 'BAREMETALSTORAGECLASS',
  'ALLREQUIREDFIELDS' = 'ALLREQUIREDFIELDS',
  'MINIMUMNODES' = 'MINIMUMNODES',
  'ENCRYPTION' = 'ENCRYPTION',
  'REQUIRED_FIELD_KMS' = 'REQUIRED_FIELD_KMS',
  'NETWORK' = 'NETWORK',
  'INTERNAL_FLEXIBLE_SCALING' = 'INTERNAL_FLEXIBLE_SCALING',
  'ATTACHED_DEVICES_FLEXIBLE_SCALING' = 'ATTACHED_DEVICES_FLEXIBLE_SCALING',
}

export type EncryptionType = {
  inTransit: boolean;
  clusterWide: boolean;
  storageClass: boolean;
  advanced: boolean;
  hasHandled: boolean;
};

export type NodesPerZoneMap = {
  [zones: string]: number;
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
