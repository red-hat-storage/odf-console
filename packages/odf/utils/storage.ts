import { DiskSize as QuotaSize } from '@odf/core/constants';
import { ResourceProfile, StorageQuota } from '@odf/core/types';
import {
  CAPACITY_AUTOSCALING_PROVIDERS,
  STORAGE_SIZE_UNIT_NAME_MAP,
} from '@odf/shared/constants';
import { InfraProviders, K8sResourceKind } from '@odf/shared/types';
import {
  convertToBaseValue,
  humanizeBinaryBytes,
} from '@odf/shared/utils/humanize';

export const calcPVsCapacity = (pvs: K8sResourceKind[]): number =>
  pvs.reduce((sum, pv) => {
    const storage = Number(convertToBaseValue(pv.spec.capacity.storage));
    return sum + storage;
  }, 0);

export const isCapacityAutoScalingAllowed = (
  infraProvider: InfraProviders,
  resourceProfile: ResourceProfile
) =>
  CAPACITY_AUTOSCALING_PROVIDERS.includes(infraProvider) &&
  resourceProfile !== ResourceProfile.Lean;

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
    STORAGE_SIZE_UNIT_NAME_MAP[QuotaSize.Gi]
  );
  return humanizedQuota.value;
};
