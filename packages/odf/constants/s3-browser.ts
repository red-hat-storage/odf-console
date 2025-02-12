export const NOOBAA_ADMIN_SECRET = 'noobaa-admin';
export const NOOBAA_S3_ROUTE = 's3';
export const NOOBAA_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID';
export const NOOBAA_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY';

export const DELIMITER = '/';
export const PREFIX = 'prefix';
export const SEARCH = 'search';
export const MAX_KEYS = 300;
export const MAX_BUCKETS = 100;

export const BUCKET_NAME_MAX_LENGTH = 63;
export const BUCKET_NAME_MIN_LENGTH = 3;

export const BUCKETS_BASE_ROUTE = '/odf/object-storage/buckets';
export const BUCKET_CREATE_PAGE_PATH = '/odf/object-storage/create-bucket';
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

// Bookmarking / favorites
export const BUCKET_BOOKMARKS_USER_SETTINGS_KEY =
  'odf-console-bucket-bookmarks';
