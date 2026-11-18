import {
  BucketVersioningStatus,
  GetBucketVersioningCommandOutput,
  GetObjectLockConfigurationCommandOutput,
  ObjectLockEnabled,
  ObjectLockRetentionMode,
} from '@aws-sdk/client-s3';
import { TFunction } from 'i18next';
import { DateTime } from 'luxon';

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

// No retention set on the object, or Object Lock not enabled on the bucket.
export const isNoObjectRetentionError = (error) =>
  ['NoSuchObjectLockConfiguration', 'InvalidRequest'].includes(error?.name);

// No legal hold set on the object, or Object Lock not enabled on the bucket.
export const isNoObjectLegalHoldError = (error) =>
  [
    'InvalidRequest',
    'NoSuchObjectLockConfiguration',
    'ObjectLockConfigurationNotFoundError',
  ].includes(error?.name);

export const getIsObjectLockEnabled = (
  objectLockData: GetObjectLockConfigurationCommandOutput
) =>
  objectLockData?.ObjectLockConfiguration?.ObjectLockEnabled ===
  ObjectLockEnabled.Enabled;

export const getDefaultRetention = (
  objectLockData: GetObjectLockConfigurationCommandOutput
) => objectLockData?.ObjectLockConfiguration?.Rule?.DefaultRetention;

export enum RetentionPeriodUnit {
  DAYS = 'Days',
  YEARS = 'Years',
}

export const calculateRetainUntilDate = (
  period: number,
  unit: RetentionPeriodUnit
): Date =>
  DateTime.now()
    .plus(
      unit === RetentionPeriodUnit.YEARS ? { years: period } : { days: period }
    )
    .toJSDate();

export const getRetentionPeriodDetails = (
  retainUntilDate?: Date
): { period?: number; unit?: RetentionPeriodUnit } => {
  if (!retainUntilDate) {
    return {};
  }

  const now = DateTime.now();
  const target = DateTime.fromJSDate(new Date(retainUntilDate));
  if (target <= now) {
    return { period: 0, unit: RetentionPeriodUnit.DAYS };
  }

  const approxYears = Math.round(target.diff(now, 'years').years);
  if (
    approxYears >= 1 &&
    now.plus({ years: approxYears }).hasSame(target, 'day')
  ) {
    return { period: approxYears, unit: RetentionPeriodUnit.YEARS };
  }

  return {
    period: Math.max(Math.ceil(target.diff(now, 'days').days), 0),
    unit: RetentionPeriodUnit.DAYS,
  };
};

export const getRetentionModalLabel = (
  mode: ObjectLockRetentionMode | undefined,
  t: TFunction
): string => {
  switch (mode) {
    case ObjectLockRetentionMode.GOVERNANCE:
      return t('Governance');

    case ObjectLockRetentionMode.COMPLIANCE:
      return t('Compliance');

    default:
      return '';
  }
};
