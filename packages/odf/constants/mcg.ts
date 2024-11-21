import * as _ from 'lodash-es';

export enum StoreProviders {
  AWS = 'AWS S3',
  S3 = 'S3 Compatible',
  PVC = 'PVC',
  GCP = 'Google Cloud Storage',
  AZURE = 'Azure Blob',
  IBM = 'IBM COS',
  FILESYSTEM = 'Filesystem',
}

export const PROVIDERS_NOOBAA_MAP = {
  [StoreProviders.AWS]: 'awsS3' as const,
  [StoreProviders.S3]: 's3Compatible' as const,
  [StoreProviders.AZURE]: 'azureBlob' as const,
  [StoreProviders.GCP]: 'googleCloudStorage' as const,
  [StoreProviders.PVC]: 'pvPool' as const,
  [StoreProviders.IBM]: 'ibmCos' as const,
  [StoreProviders.FILESYSTEM]: 'nsfs' as const,
};

export const NOOBAA_TYPE_MAP = {
  [StoreProviders.AWS]: 'aws-s3' as const,
  [StoreProviders.S3]: 's3-compatible' as const,
  [StoreProviders.AZURE]: 'azure-blob' as const,
  [StoreProviders.GCP]: 'google-cloud-storage' as const,
  [StoreProviders.PVC]: 'pv-pool' as const,
  [StoreProviders.IBM]: 'ibm-cos' as const,
  [StoreProviders.FILESYSTEM]: 'nsfs' as const,
};

export type SpecProvider =
  typeof PROVIDERS_NOOBAA_MAP[keyof typeof PROVIDERS_NOOBAA_MAP];
export type SpecType = typeof NOOBAA_TYPE_MAP[keyof typeof NOOBAA_TYPE_MAP];

export enum StoreType {
  BS = 'BackingStore',
  NS = 'NamespaceStore',
}

export const BUCKET_LABEL_NOOBAA_MAP = {
  [StoreProviders.AWS]: 'targetBucket',
  [StoreProviders.S3]: 'targetBucket',
  [StoreProviders.AZURE]: 'targetBlobContainer',
  [StoreProviders.GCP]: 'targetBucket',
  [StoreProviders.IBM]: 'targetBucket',
};

export const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'ap-east-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'me-south-1',
  'sa-east-1',
  'us-gov-west-1',
  'us-gov-east-1',
];

export const NS_PROVIDERS_NOOBAA_MAP = _.pick(
  PROVIDERS_NOOBAA_MAP,
  StoreProviders.AWS,
  StoreProviders.S3,
  StoreProviders.AZURE,
  StoreProviders.IBM,
  StoreProviders.FILESYSTEM
);

export const NS_NOOBAA_TYPE_MAP = _.pick(
  NOOBAA_TYPE_MAP,
  StoreProviders.AWS,
  StoreProviders.S3,
  StoreProviders.AZURE,
  StoreProviders.IBM
);

export enum NamespacePolicyType {
  SINGLE = 'Single',
  MULTI = 'Multi',
  CACHE = 'Cache',
}

export const RGW_PROVISIONER = 'ceph.rook.io/bucket';
export const NOOBAA_PROVISIONER = 'noobaa.io/obc';

export const ATTACH_DEPLOYMENT = 'ATTACH_DEPLOYMENT';
