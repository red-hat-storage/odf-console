import {
  BucketVersioningStatus,
  GetBucketVersioningCommandOutput,
} from '@aws-sdk/client-s3';
import {
  CLIENT_S3_PROXY_PATH,
  ODF_S3_PROXY_PATH,
} from '@odf/shared/s3/constants';
import { isClientPlugin } from '@odf/shared/utils';
import { TFunction } from 'react-i18next';

export const isNoLifecycleRuleError = (error) =>
  error?.name === 'NoSuchLifecycleConfiguration';

export const getProxyPath = () =>
  isClientPlugin() ? CLIENT_S3_PROXY_PATH : ODF_S3_PROXY_PATH;

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
