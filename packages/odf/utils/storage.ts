import {
  DiskSize as QuotaSize,
  diskSizeUnitOptions as QuotaSizeUnitOptions,
} from '@odf/core/constants';
import { StorageQuota } from '@odf/core/types';
import { K8sResourceKind } from '@odf/shared/types';
import {
  convertToBaseValue,
  humanizeBinaryBytes,
} from '@odf/shared/utils/humanize';

export const calcPVsCapacity = (pvs: K8sResourceKind[]): number =>
  pvs.reduce((sum, pv) => {
    const storage = Number(convertToBaseValue(pv.spec.capacity.storage));
    return sum + storage;
  }, 0);

export const isUnlimitedQuota = (quota: StorageQuota) => quota.value === 0;

export const isValidQuota = (
  quota: StorageQuota,
  initialQuota: StorageQuota
): boolean => {
  if (isUnlimitedQuota(quota) || !initialQuota) {
    return true;
  }
  return getQuotaValueInGiB(quota) >= getQuotaValueInGiB(initialQuota);
};

export const getQuotaValueInGiB = (quota: StorageQuota) => {
  const humanizedQuota = humanizeBinaryBytes(
    convertToBaseValue(`${quota.value}${quota.unit}`),
    `B`,
    QuotaSizeUnitOptions[QuotaSize.Gi]
  );
  return humanizedQuota.value;
};
