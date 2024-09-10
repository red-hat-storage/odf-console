import {
  ListBucketsCommandInput,
  ListBucketsCommandOutput,
  ListObjectsCommandInput,
  ListObjectsCommandOutput,
} from '@aws-sdk/client-s3';

// Bucket command types
export type ListBuckets = (
  input?: ListBucketsCommandInput
) => Promise<ListBucketsCommandOutput>;

// Object command types
export type ListObjects = (
  input: ListObjectsCommandInput
) => Promise<ListObjectsCommandOutput>;
