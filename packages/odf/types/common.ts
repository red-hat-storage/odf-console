import { NodeKind } from '@odf/shared';
import { WatchK8sResource } from '@openshift-console/dynamic-plugin-sdk';

export type K8sResourceObj = (ns: string) => WatchK8sResource;

export enum BackingStorageType {
  EXISTING = 'existing',
  LOCAL_DEVICES = 'local-devices',
  EXTERNAL = 'external',
}

// t('Full deployment')
// t('MultiCloud Object Gateway')
// t('Provider Mode')
export enum DeploymentType {
  FULL = 'Full deployment',
  MCG = 'MultiCloud Object Gateway',
  PROVIDER_MODE = 'Provider Mode',
}

export enum VolumeTypeValidation {
  NONE = 'None',
  UNKNOWN = 'Unknown',
  ERROR = 'Error',
  INFO = 'Info',
}

export enum ValidationType {
  'MINIMAL' = 'MINIMAL',
  'RESOURCE_PROFILE' = 'RESOURCE_PROFILE',
  'INTERNALSTORAGECLASS' = 'INTERNALSTORAGECLASS',
  'BAREMETALSTORAGECLASS' = 'BAREMETALSTORAGECLASS',
  'ALLREQUIREDFIELDS' = 'ALLREQUIREDFIELDS',
  'MINIMUMNODES' = 'MINIMUMNODES',
  'ENCRYPTION' = 'ENCRYPTION',
  'REQUIRED_FIELD_KMS' = 'REQUIRED_FIELD_KMS',
  'NETWORK' = 'NETWORK',
  'INTERNAL_FLEXIBLE_SCALING' = 'INTERNAL_FLEXIBLE_SCALING',
  'ATTACHED_DEVICES_FLEXIBLE_SCALING' = 'ATTACHED_DEVICES_FLEXIBLE_SCALING',
  'VOLUME_TYPE' = 'VOLUME_TYPE',
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

export type NodeData = NodeKind & {
  metrics: {
    memory: string;
  };
};

// t('Lean mode')
// t('Balanced mode')
// t('Performance mode')
export enum ResourceProfile {
  Lean = 'lean',
  Balanced = 'balanced',
  Performance = 'performance',
}

export type ResourceProfileRequirementsMap = {
  [key in ResourceProfile]: {
    minCpu: number;
    minMem: number;
    osd: {
      cpu: number;
      mem: number;
    };
  };
};
