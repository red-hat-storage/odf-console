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

// Bucket command types (alphabetical order)
export type CreateBucket = (
  input?: CreateBucketCommandInput
) => Promise<CreateBucketCommandOutput>;

export type ListBuckets = (
  input?: ListBucketsCommandInput
) => Promise<ListBucketsCommandOutput>;

export type PutBucketTags = (
  input?: PutBucketTaggingCommandInput
) => Promise<PutBucketTaggingCommandOutput>;

// Object command types (alphabetical order)
export type DeleteObjects = (
  input: DeleteObjectsCommandInput
) => Promise<DeleteObjectsCommandOutput>;

export type GetObject = (
  input: GetObjectCommandInput
) => Promise<GetObjectCommandOutput>;

export type GetSignedUrl = (
  input: GetObjectCommandInput,
  expiresIn: number
) => Promise<string>;

export type ListCommandOutput =
  | ListObjectsV2CommandOutput
  | ListBucketsCommandOutput;

export type ListObjectsV2 = (
  input: ListObjectsV2CommandInput
) => Promise<ListObjectsV2CommandOutput>;
