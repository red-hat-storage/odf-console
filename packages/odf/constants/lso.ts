import { TFunction } from 'i18next';

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
});

export const diskTypeDropdownItems = (t: TFunction) =>
  Object.freeze({
    All: t('plugin__odf-console~All'),
    SSD: t('plugin__odf-console~SSD / NVMe'),
    HDD: t('plugin__odf-console~HDD'),
  });

export const diskSizeUnitOptions = {
  Ti: 'TiB',
  Gi: 'GiB',
};
