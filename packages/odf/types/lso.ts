import { Toleration } from '@odf/shared/types';
import {
  K8sResourceCommon,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk';

export enum DiskType {
  RawDisk = 'disk',
  Partition = 'part',
}

export enum DiskMechanicalProperties {
  'NonRotational' = 'NonRotational',
  'Rotational' = 'Rotational',
}

export enum DiskStates {
  Available = 'Available',
  NotAvailable = 'NotAvailable',
  Unknown = 'Unknown',
}

export const DISK_TYPES: {
  [key: string]: {
    property: keyof typeof DiskMechanicalProperties;
  };
} = {
  SSD: {
    property: 'NonRotational',
  },
  HDD: {
    property: 'Rotational',
  },
};

export type LocalVolumeSetKind = K8sResourceCommon & {
  spec: {
    storageClassName: string;
    volumeMode: string;
    fsType: string;
    deviceInclusionSpec: {
      deviceTypes?: DiskType[];
      deviceMechanicalProperties: [keyof typeof DiskMechanicalProperties];
      minSize?: string;
      maxSize?: string;
    };
    nodeSelector?: {
      nodeSelectorTerms: {
        matchExpressions: { key: string; operator: string; values: string[] }[];
      }[];
    };
    maxDeviceCount?: number;
    tolerations?: Toleration[];
  };
};

export type LocalVolumeDiscoveryKind = K8sResourceCommon & {
  spec: {
    nodeSelector?: {
      nodeSelectorTerms: {
        matchExpressions: MatchExpression[];
        matchFields?: MatchExpression[];
      }[];
    };
    tolerations?: Toleration[];
  };
};

export type DiskMetadata = {
  deviceID: string;
  fstype: string;
  model: string;
  path: string;
  serial: string;
  size: number;
  status: {
    state: keyof typeof DiskStates;
  };
  type: string;
  vendor: string;
  property: keyof typeof DiskMechanicalProperties;
};

export type DiscoveredDisk = {
  node: string;
} & DiskMetadata;

export type LocalVolumeDiscoveryResultKind = K8sResourceCommon & {
  spec: {
    nodeName: string;
  };
  status: {
    discoveredDevices: DiskMetadata[];
  };
};
