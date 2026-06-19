import { STORAGE_SIZE_UNIT_NAME_MAP } from '@odf/shared';
import { StorageSizeUnit } from '@odf/shared/types/storage';
import { TFunction } from 'react-i18next';
import { DiskType } from '../types';

export const LABEL_SELECTOR = 'discovery-result-node';
export const DISCOVERY_CR_NAME = 'auto-discover-devices';
export const LSO_OPERATOR = 'local-storage-operator';
export const ATTACHED_DEVICES_ANNOTATION =
  'cluster.ocs.openshift.io/local-devices';

export const diskModeDropdownItems = Object.freeze({
  BLOCK: 'Block',
  FILESYSTEM: 'Filesystem',
});

export const deviceTypeDropdownItems = Object.freeze({
  DISK: 'Disk',
  PART: 'Part',
  MPATH: 'Mpath',
});

export const diskTypeDropdownItems = (t: TFunction) =>
  Object.freeze({
    [DiskType.All]: t('plugin__odf-console~All'),
    [DiskType.SSD]: t('plugin__odf-console~SSD / NVMe'),
    [DiskType.HDD]: t('plugin__odf-console~HDD'),
  });

// DiskSize is a subset of StorageSizeUnit.
export enum DiskSize {
  Ti = StorageSizeUnit.Ti,
  Gi = StorageSizeUnit.Gi,
}

export const diskSizeUnitOptions = {
  [DiskSize.Ti]: STORAGE_SIZE_UNIT_NAME_MAP[DiskSize.Ti],
  [DiskSize.Gi]: STORAGE_SIZE_UNIT_NAME_MAP[DiskSize.Gi],
};

export const fsTypeDropdownItems = Object.freeze({
  EXT4: 'ext4',
  EXT3: 'ext3',
  XFS: 'xfs',
});

export const lsoInstallationPage =
  '/catalog/ns/default?selectedId=local-storage-operator-redhat-operators-openshift-marketplace';
