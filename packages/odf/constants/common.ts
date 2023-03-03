import { Toleration, Taint } from '@odf/shared/types';
import { TFunction } from 'i18next';

export const CEPH_BRAND_NAME = 'Red Hat Ceph Storage';
export const NO_PROVISIONER = 'kubernetes.io/no-provisioner';
export const STORAGE_CLUSTER_SYSTEM_KIND = 'storagecluster.ocs.openshift.io/v1';
export const OCS_EXTERNAL_CR_NAME = 'ocs-external-storagecluster';
export const OCS_INTERNAL_CR_NAME = 'ocs-storagecluster';
export const HOSTNAME_LABEL_KEY = 'kubernetes.io/hostname';
export const LABEL_OPERATOR = 'In';
export const RACK_LABEL = 'topology.rook.io/rack';
export const OCS_SUPPORT_ANNOTATION = 'features.ocs.openshift.io/enabled';
export const OCS_DISABLED_ANNOTATION = 'features.ocs.openshift.io/disabled';
export const ODF_VENDOR_ANNOTATION = 'vendors.odf.openshift.io/kind';
export const CEPH_STORAGE_LABEL = 'cluster.ocs.openshift.io/openshift-storage';
export const ODF_MANAGED_LABEL = 'odf-managed-service';
export const OCS_OPERATOR = 'ocs-operator';
export const OCS_DEVICE_SET_FLEXIBLE_REPLICA = 1;
export const MINIMUM_NODES = 3;
export const SECOND = 1000;

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
