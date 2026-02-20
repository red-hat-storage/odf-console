import { S3ProviderType } from '../types';

export const getVectorBucketCreatePageRoute = (s3Provider: string) =>
  `/odf/object-storage/${s3Provider}/create-vector-bucket`;

// Bookmarking / favorites
export const VECTOR_BUCKET_BOOKMARKS_USER_SETTINGS_KEY =
  'odf-console-vector-bucket-bookmarks';

export const VECTOR_BUCKETS_BASE_ROUTE = '/odf/object-storage/vector-buckets';

export const getVectorBucketOverviewBaseRoute = (
  vectorBucketName: string,
  providerType: S3ProviderType
) => `/odf/object-storage/${providerType}/vector-buckets/${vectorBucketName}`;

export const MAX_VECTOR_BUCKETS = 100;

// key to be used by SWR for caching particular API call
export const LIST_VECTOR_BUCKET = 'LIST_VECTOR_BUCKET_CACHE_KEY';
