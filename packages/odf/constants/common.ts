import {
  ResourceProfile,
  ResourceProfileRequirementsMap,
} from '@odf/core/types';
import { DEFAULT_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { ODFStorageSystem } from '@odf/shared/models';
import { Toleration, Taint } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import { TFunction } from 'react-i18next';

export const CEPH_BRAND_NAME = 'Red Hat Ceph Storage';
export const NO_PROVISIONER = 'kubernetes.io/no-provisioner';
export const SCALE_PROVISIONER = 'spectrumscale.csi.ibm.com';
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

// ToDo (epic 4422): Use StorageSystem namespace once we support multiple internal clusters
export const cephStorageLabel = (_ns: string) =>
  `cluster.ocs.openshift.io/${DEFAULT_STORAGE_NAMESPACE}`;

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

/** Architecture identifier for IBM Z/s390x */
export const ARCHITECTURE_S390X = 's390x';

/**
 * s390x specific CPU adjustments
 */
export const S390X_CPU_ADJUSTMENTS = {
  [ResourceProfile.Lean]: {
    minCpu: 15,
    osdCpu: 0.75,
  },
  [ResourceProfile.Balanced]: {
    minCpu: 21,
    osdCpu: 1,
  },
  [ResourceProfile.Performance]: {
    minCpu: 30,
    osdCpu: 2,
  },
};

export enum DefaultRequestSize {
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
  AdvancedSettings = 'advanced-settings',
}

export enum CreateStepsSC {
  DISCOVER = 'DISCOVER',
  STORAGECLASS = 'STORAGECLASS',
  STORAGEANDNODES = 'STORAGEANDNODES',
  CONFIGURE = 'CONFIGURE',
  REVIEWANDCREATE = 'REVIEWANDCREATE',
}

export const ZONE_LABELS = [
  'topology.kubernetes.io/zone',
  'failure-domain.beta.kubernetes.io/zone', // deprecated
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
  [Steps.AdvancedSettings]: t('plugin__odf-console~Advanced settings'),
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

export const CREATE_SS_PAGE_URL = `/odf/resource/${referenceForModel(
  ODFStorageSystem
)}/create/~new`;

export const FLASH_STORAGE_CLASS = 'flash-storage';
