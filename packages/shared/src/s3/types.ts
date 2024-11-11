import {
  CreateBucketCommandInput,
  CreateBucketCommandOutput,
  GetBucketAclCommandInput,
  GetBucketAclCommandOutput,
  GetBucketEncryptionCommandInput,
  GetBucketEncryptionCommandOutput,
  GetBucketPolicyCommandInput,
  GetBucketPolicyCommandOutput,
  GetBucketTaggingCommandOutput,
  GetBucketTaggingCommandInput,
  GetBucketVersioningCommandInput,
  GetBucketVersioningCommandOutput,
  ListBucketsCommandInput,
  ListBucketsCommandOutput,
  ListObjectsV2CommandInput,
  ListObjectsV2CommandOutput,
  PutBucketTaggingCommandInput,
  PutBucketTaggingCommandOutput,
  DeleteObjectsCommandInput,
  DeleteObjectsCommandOutput,
  GetObjectCommandInput,
  GetObjectCommandOutput,
  GetObjectTaggingCommandInput,
  GetObjectTaggingCommandOutput,
} from '@aws-sdk/client-s3';

// Bucket command types
export type CreateBucket = (
  input?: CreateBucketCommandInput
) => Promise<CreateBucketCommandOutput>;

export type GetBucketAcl = (
  input?: GetBucketAclCommandInput
) => Promise<GetBucketAclCommandOutput>;

export type GetBucketEncryption = (
  input?: GetBucketEncryptionCommandInput
) => Promise<GetBucketEncryptionCommandOutput>;

export type GetBucketPolicy = (
  input?: GetBucketPolicyCommandInput
) => Promise<GetBucketPolicyCommandOutput>;

export type GetBucketTagging = (
  input?: GetBucketTaggingCommandInput
) => Promise<GetBucketTaggingCommandOutput>;

export type GetBucketVersioning = (
  input?: GetBucketVersioningCommandInput
) => Promise<GetBucketVersioningCommandOutput>;

export type ListBuckets = (
  input?: ListBucketsCommandInput
) => Promise<ListBucketsCommandOutput>;

export type PutBucketTags = (
  input?: PutBucketTaggingCommandInput
) => Promise<PutBucketTaggingCommandOutput>;

// Object command types
export type DeleteObjects = (
  input: DeleteObjectsCommandInput
) => Promise<DeleteObjectsCommandOutput>;

export type GetObject = (
  input: GetObjectCommandInput
) => Promise<GetObjectCommandOutput>;

export type GetObjectTagging = (
  input: GetObjectTaggingCommandInput
) => Promise<GetObjectTaggingCommandOutput>;

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

// Bucket Policy

type BucketPolicyCondition = Record<string, string>;

type BucketPolicyStatement = {
  Action: string | string[];
  Condition?: Record<string, BucketPolicyCondition>;
  Effect: 'Allow' | 'Deny';
};

export type BucketPolicy = {
  Statement: BucketPolicyStatement[];
};
