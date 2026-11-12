import {
  BucketVersioningStatus,
  GetBucketVersioningCommandOutput,
  GetObjectLockConfigurationCommandOutput,
  ObjectLockEnabled,
} from '@aws-sdk/client-s3';
import { TFunction } from 'i18next';

export const isNoLifecycleRuleError = (error) =>
  error?.name === 'NoSuchLifecycleConfiguration';

export const isNoPabError = (error) =>
  error?.name === 'NoSuchPublicAccessBlockConfiguration';

export const getVersioningStatus = (
  versioningData: GetBucketVersioningCommandOutput,
  t: TFunction
): string => {
  if (!versioningData?.Status) return t('Disabled');
  return versioningData.Status === BucketVersioningStatus.Enabled
    ? t('Enabled')
    : t('Suspended');
};

export const getIsVersioningEnabled = (
  versioningData: GetBucketVersioningCommandOutput
) => versioningData?.Status === BucketVersioningStatus.Enabled;

export const getIsVersioningSuspended = (
  versioningData: GetBucketVersioningCommandOutput
) => versioningData?.Status === BucketVersioningStatus.Suspended;

export const isNoCorsRuleError = (error) =>
  error?.name === 'NoSuchCORSConfiguration';

export const isNoObjectLockConfigurationError = (error) =>
  error?.name === 'ObjectLockConfigurationNotFoundError';

export const getIsObjectLockEnabled = (
  objectLockData: GetObjectLockConfigurationCommandOutput
) =>
  objectLockData?.ObjectLockConfiguration?.ObjectLockEnabled ===
  ObjectLockEnabled.Enabled;

export const getDefaultRetention = (
  objectLockData: GetObjectLockConfigurationCommandOutput
) => objectLockData?.ObjectLockConfiguration?.Rule?.DefaultRetention;

export const calculateRetainUntilDate = (
  period: number,
  unit: 'Days' | 'Years'
): Date => {
  const date = new Date();
  if (unit === 'Days') {
    date.setDate(date.getDate() + period);
  } else {
    date.setFullYear(date.getFullYear() + period);
  }
  return date;
};

// Derive a Days/Years period from an absolute RetainUntilDate so the
// retention modal can be pre-filled when editing an existing object lock.
export const getRetentionPeriodFromDate = (
  retainUntilDate: Date
): { period: number; unit: 'Days' | 'Years' } => {
  const msRemaining = new Date(retainUntilDate).getTime() - Date.now();
  const daysRemaining = Math.max(
    Math.ceil(msRemaining / (1000 * 60 * 60 * 24)),
    0
  );

  // Prefer whole years when the remaining duration maps cleanly.
  if (daysRemaining >= 365 && daysRemaining % 365 === 0) {
    return { period: daysRemaining / 365, unit: 'Years' };
  }

  return { period: daysRemaining, unit: 'Days' };
};
