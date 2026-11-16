import { TFunction } from 'i18next';

// Keep in sync with odf-multicluster-orchestrator/api/v1alpha1/s3configuration_types.go

export enum S3ConfigurationPhase {
  Pending = 'Pending',
  Configuring = 'Configuring',
  Ready = 'Ready',
  Failed = 'Failed',
}

export enum S3Type {
  Internal = 'Internal',
  External = 'External',
}

export const S3_CONFIGURATION_PHASE_DISPLAY_TEXT = (
  t: TFunction
): { [key in S3ConfigurationPhase]: string } => ({
  [S3ConfigurationPhase.Pending]: t('Pending'),
  [S3ConfigurationPhase.Configuring]: t('Configuring'),
  [S3ConfigurationPhase.Ready]: t('Ready'),
  [S3ConfigurationPhase.Failed]: t('Failed'),
});

// Required on the hub secret referenced by spec.externalS3.secretRef.
export const S3_BUCKET_NAME = 's3Bucket';
export const S3_COMPATIBLE_ENDPOINT = 's3CompatibleEndpoint';
export const S3_REGION = 's3Region';

// Mirrors MCO's derivation: `<storage cluster namespace>.noobaa.io`.
export const NOOBAA_STORAGE_CLASS_SUFFIX = '.noobaa.io';
