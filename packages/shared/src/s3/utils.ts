import {
  BucketVersioningStatus,
  GetBucketVersioningCommandOutput,
} from '@aws-sdk/client-s3';
import { TFunction } from 'react-i18next';

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
