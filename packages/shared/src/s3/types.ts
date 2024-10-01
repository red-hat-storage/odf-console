import {
  CreateBucketCommandInput,
  CreateBucketCommandOutput,
  ListBucketsCommandInput,
  ListBucketsCommandOutput,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  PutBucketTaggingCommandInput,
  PutBucketTaggingCommandOutput,
} from '@aws-sdk/client-s3';

// Bucket command types
export type CreateBucket = (
  input?: CreateBucketCommandInput
) => Promise<CreateBucketCommandOutput>;

export type ListBuckets = (
  input?: ListBucketsCommandInput
) => Promise<ListBucketsCommandOutput>;

export type PutBucketTags = (
  input?: PutBucketTaggingCommandInput
) => Promise<PutBucketTaggingCommandOutput>;

// Object command types
export type ListObjectsV2 = (
  input: ListObjectsV2CommandInput
) => Promise<ListObjectsV2CommandOutput>;
