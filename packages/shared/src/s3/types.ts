import {
  ListBucketsCommandInput,
  ListBucketsCommandOutput,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';

// Bucket command types
export type ListBuckets = (
  input?: ListBucketsCommandInput
) => Promise<ListBucketsCommandOutput>;

// Object command types
export type ListObjectsV2 = (
  input: ListObjectsV2CommandInput
) => Promise<ListObjectsV2CommandOutput>;
