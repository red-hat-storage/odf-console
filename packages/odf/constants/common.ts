import {
  ResourceProfile,
  ResourceProfileRequirementsMap,
} from '@odf/core/types';
import { Toleration, Taint } from '@odf/shared/types';
import { TFunction } from 'i18next';

export const CEPH_BRAND_NAME = 'Red Hat Ceph Storage';
export const NO_PROVISIONER = 'kubernetes.io/no-provisioner';
export const STORAGE_CLUSTER_SYSTEM_KIND = 'storagecluster.ocs.openshift.io/v1';
export const HOSTNAME_LABEL_KEY = 'kubernetes.io/hostname';
export const LABEL_OPERATOR = 'In';
export const OCS_SUPPORT_ANNOTATION = 'features.ocs.openshift.io/enabled';
export const OCS_DISABLED_ANNOTATION = 'features.ocs.openshift.io/disabled';
export const ODF_VENDOR_ANNOTATION = 'vendors.odf.openshift.io/kind';
export const OCS_DEVICE_SET_FLEXIBLE_REPLICA = 1;
export const OCS_DEVICE_SET_MINIMUM_REPLICAS = 3;
export const MINIMUM_NODES = 3;
export const SECOND = 1000;

export const cephStorageLabel = (ns: string) =>
  `cluster.ocs.openshift.io/${ns}`;

/**
 * Map between resource profiles and the minimum cpu's and memory (expressed in GiB) required
 * for the profile to be selectable.
 * Also maps the OSD pod resources' requests per profile.
 * https://github.com/red-hat-storage/ocs-operator/blob/main/controllers/defaults/resources.go
 */
export const RESOURCE_PROFILE_REQUIREMENTS_MAP: ResourceProfileRequirementsMap =
  {
    [ResourceProfile.Lean]: {
      minCpu: 24,
      minMem: 72,
      osd: {
        cpu: 1.5,
        mem: 3,
      },
    },
    [ResourceProfile.Balanced]: {
      minCpu: 30,
      minMem: 72,
      osd: {
        cpu: 2,
        mem: 5,
      },
    },
    [ResourceProfile.Performance]: {
      minCpu: 45,
      minMem: 96,
      osd: {
        cpu: 4,
        mem: 8,
      },
    },
  };

export enum defaultRequestSize {
  BAREMETAL = '1',
  NON_BAREMETAL = '2Ti',
}

export enum Steps {
  BackingStorage = 'backing-storage',
  CreateStorageClass = 'create-storage-class',
  CreateLocalVolumeSet = 'create-local-volume-set',
  CapacityAndNodes = 'capacity-and-nodes',
  SecurityAndNetwork = 'security-and-network',
  Security = 'security',
  ReviewAndCreate = 'review-and-create',
  DataProtection = 'DataProtection',
}

export enum CreateStepsSC {
  DISCOVER = 'DISCOVER',
  STORAGECLASS = 'STORAGECLASS',
  STORAGEANDNODES = 'STORAGEANDNODES',
  CONFIGURE = 'CONFIGURE',
  REVIEWANDCREATE = 'REVIEWANDCREATE',
}

export const SIZE_IN_TB = {
  Gi: 1024,
  Ti: 1,
};

export const OSD_CAPACITY_SIZES = {
  '512Gi': 0.5,
  '2Ti': 2,
  '4Ti': 4,
};

export const ZONE_LABELS = [
  'topology.kubernetes.io/zone',
  'failure-domain.beta.kubernetes.io/zone', // deprecated
];

export const OCS_PROVISIONERS = [
  'ceph.rook.io/block',
  'cephfs.csi.ceph.com',
  'rbd.csi.ceph.com',
  'noobaa.io/obc',
  'ceph.rook.io/bucket',
];

export const StepsName = (t: TFunction) => ({
  [Steps.CapacityAndNodes]: t('plugin__odf-console~Capacity and nodes'),
  [Steps.BackingStorage]: t('plugin__odf-console~Backing storage'),
  [Steps.CreateStorageClass]: t('plugin__odf-console~Create storage class'),
  [Steps.CreateLocalVolumeSet]: t(
    'plugin__odf-console~Create local volume set'
  ),
  [Steps.ReviewAndCreate]: t('plugin__odf-console~Review and create'),
  [Steps.SecurityAndNetwork]: t('plugin__odf-console~Security and network'),
  [Steps.Security]: t('plugin__odf-console~Security'),
  [Steps.DataProtection]: t('plugin__odf-console~Data protection'),
});

export const ocsTaint: Taint = Object.freeze({
  key: 'node.ocs.openshift.io/storage',
  value: 'true',
  effect: 'NoSchedule',
});

export const OCS_TOLERATION: Toleration = { ...ocsTaint, operator: 'Equal' };

export enum TimeUnits {
  HOUR = 'Hour',
  MIN = 'Min',
}
