import { S3ProviderType } from '../types';

export const getVectorBucketCreatePageRoute = (s3Provider: string) =>
  `/odf/object-storage/${s3Provider}/create-vector-bucket`;

// Bookmarking / favorites
export const VECTOR_BUCKET_BOOKMARKS_USER_SETTINGS_KEY =
  'odf-console-vector-bucket-bookmarks';

export const VECTOR_BUCKETS_BASE_ROUTE = '/odf/object-storage/vector-buckets';

export const getVectorBucketOverviewBaseRoute = (
  vectorBucketName: string,
  s3Provider: S3ProviderType
) => `/odf/object-storage/${s3Provider}/vector-buckets/${vectorBucketName}`;

export const MAX_VECTOR_BUCKETS = 100;
export const MAX_VECTOR_INDEXES = 100;

export const LIST_VECTOR_BUCKET = 'LIST_VECTOR_BUCKET_CACHE_KEY';
export const LIST_VECTOR_INDEX = 'LIST_VECTOR_INDEX_CACHE_KEY';

// Vector index
export const MAX_METADATA_KEYS = 10;
export const METADATA_KEY_MAX_LENGTH = 63;

export const VECTOR_INDEX_NAME_MAX_LENGTH = 63;
export const VECTOR_INDEX_NAME_MIN_LENGTH = 3;
