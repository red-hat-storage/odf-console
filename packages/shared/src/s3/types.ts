import {
  CreateBucketCommandInput,
  CreateBucketCommandOutput,
  ListBucketsCommandInput,
  ListBucketsCommandOutput,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  PutBucketTaggingCommandInput,
  PutBucketTaggingCommandOutput,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  DeleteObjectsCommandInput,
  DeleteObjectsCommandOutput,
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

export type GetSignedUrl = (
  input: GetObjectCommandInput,
  expiresIn: number
) => Promise<string>;

export type GetObject = (
  input: GetObjectCommandInput
) => Promise<GetObjectCommandOutput>;

export type DeleteObjects = (
  input: DeleteObjectsCommandInput
) => Promise<DeleteObjectsCommandOutput>;

export type ListCommandOutput =
  | ListObjectsV2CommandOutput
  | ListBucketsCommandOutput;
