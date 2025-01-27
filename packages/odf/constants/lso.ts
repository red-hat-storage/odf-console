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

export enum DiskSize {
  Ti = 'Ti',
  Gi = 'Gi',
}

export const diskSizeUnitOptions = {
  [DiskSize.Ti]: 'TiB',
  [DiskSize.Gi]: 'GiB',
};
