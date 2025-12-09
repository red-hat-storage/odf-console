import { S3ProviderType } from '../types';

export const NOOBAA_ADMIN_SECRET = 'noobaa-admin';
export const NOOBAA_S3_ROUTE = 's3';
export const NOOBAA_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID';
export const NOOBAA_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY';
const NOOBAA_COSU_NAME = 'noobaa-ceph-objectstore-user';
export const getNoobaaCOSUAdminSecret = (clusterName: string) =>
  `rook-ceph-object-user-${clusterName}-cephobjectstore-${NOOBAA_COSU_NAME}`;
export const RGW_ACCESS_KEY_ID = 'AccessKey';
export const RGW_SECRET_ACCESS_KEY = 'SecretKey';

export const DELIMITER = '/';
export const PREFIX = 'prefix';
export const SEARCH = 'search';
export const RULE_NAME = 'ruleName';
export const RULE_HASH = 'ruleHash';
export const MAX_KEYS = 300;
export const MAX_BUCKETS = 100;

export const BUCKET_NAME_MAX_LENGTH = 63;
export const BUCKET_NAME_MIN_LENGTH = 3;

export const BUCKETS_BASE_ROUTE = '/odf/object-storage/buckets';
export const getBucketOverviewBaseRoute = (
  bucketName: string,
  s3Provider: S3ProviderType
) => `/odf/object-storage/${s3Provider}/buckets/${bucketName}`;
export const getBucketCreatePageRoute = (s3Provider: string) =>
  `/odf/object-storage/${s3Provider}/create-bucket`;
export const PERMISSIONS_ROUTE = 'permissions';
export const MANAGEMENT_ROUTE = 'management';

// key to be used by SWR for caching particular API call
export const BUCKET_ACL_CACHE_KEY_SUFFIX = 'BUCKET_ACL_CACHE_KEY';
export const BUCKET_ENCRYPTION_CACHE_KEY_SUFFIX = 'BUCKET_ENCRYPTION_CACHE_KEY';
export const BUCKET_POLICY_CACHE_KEY_SUFFIX = 'BUCKET_POLICY_CACHE_KEY_SUFFIX';
export const BUCKET_TAGGING_CACHE_KEY_SUFFIX = 'BUCKET_TAGGING_CACHE_KEY';
export const BUCKET_VERSIONING_CACHE_KEY_SUFFIX = 'BUCKET_VERSIONING_CACHE_KEY';
export const BUCKET_LIFECYCLE_RULE_CACHE_KEY_SUFFIX =
  'BUCKET_LIFECYCLE_RULE_CACHE_KEY_SUFFIX';
export const LIST_BUCKET = 'LIST_BUCKET_CACHE_KEY';
export const LIST_OBJECTS = 'LIST_OBJECTS_CACHE_KEY';
export const LIST_VERSIONED_OBJECTS = 'LIST_VERSIONED_OBJECTS';
export const OBJECT_CACHE_KEY_SUFFIX = 'OBJECT_CACHE_KEY';
export const OBJECT_TAGGING_CACHE_KEY_SUFFIX = 'OBJECT_TAGGING_CACHE_KEY';
export const BUCKET_CORS_RULE_CACHE_KEY_SUFFIX =
  'BUCKET_CORS_RULE_CACHE_KEY_SUFFIX';
export const BUCKET_POLICY_STATUS_CACHE_KEY_SUFFIX =
  'BUCKET_POLICY_STATUS_CACHE_KEY_SUFFIX';
export const BUCKET_PUBLIC_ACCESS_BLOCK_CACHE_KEY_SUFFIX =
  'BUCKET_PUBLIC_ACCESS_BLOCK_CACHE_KEY_SUFFIX';

// Bookmarking / favorites
export const BUCKET_BOOKMARKS_USER_SETTINGS_KEY =
  'odf-console-bucket-bookmarks';

// Non-admin credentials (Secret name and namespace)
export const S3_CREDENTIALS_SESSION_STORE_KEY =
  'odf-console-s3-credentials-session';
export const S3_CREDENTIALS_LOCAL_STORE_KEY =
  'odf-console-s3-credentials-local';

// Custom event name for S3 storage changes (same-tab updates)
export const ODF_S3_STORAGE_EVENT = 'odf-s3-storage-event';
