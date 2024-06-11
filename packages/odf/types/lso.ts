import { Toleration } from '@odf/shared/types';
import {
  K8sResourceCommon,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk';

export enum DeviceType {
  RawDisk = 'disk',
  Partition = 'part',
  Multipath = 'mpath',
}

export enum DiskType {
  All = 'All',
  SSD = 'SSD',
  HDD = 'HDD',
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
  [DiskType.SSD]: {
    property: 'NonRotational',
  },
  [DiskType.HDD]: {
    property: 'Rotational',
  },
};

export type LocalVolumeSetKind = K8sResourceCommon & {
  spec: {
    storageClassName: string;
    volumeMode: string;
    fsType: string;
    deviceInclusionSpec: {
      deviceTypes?: DeviceType[];
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
