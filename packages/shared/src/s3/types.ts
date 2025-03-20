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
  PutBucketVersioningCommandInput,
  GetBucketVersioningCommandOutput,
  PutBucketVersioningCommandOutput,
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
  ListObjectVersionsCommandInput,
  ListObjectVersionsCommandOutput,
  DeleteBucketCommandInput,
  DeleteBucketCommandOutput,
  DeleteBucketPolicyCommandInput,
  DeleteBucketPolicyCommandOutput,
  PutBucketPolicyCommandInput,
  PutBucketPolicyCommandOutput,
  GetBucketLifecycleConfigurationCommandInput,
  GetBucketLifecycleConfigurationCommandOutput,
  PutBucketLifecycleConfigurationCommandInput,
  PutBucketLifecycleConfigurationCommandOutput,
  GetBucketCorsCommandInput,
  GetBucketCorsCommandOutput,
  PutBucketCorsCommandInput,
  PutBucketCorsCommandOutput,
} from '@aws-sdk/client-s3';

// Bucket command types
export type CreateBucket = (
  input: CreateBucketCommandInput
) => Promise<CreateBucketCommandOutput>;

export type DeleteBucket = (
  input: DeleteBucketCommandInput
) => Promise<DeleteBucketCommandOutput>;

export type GetBucketAcl = (
  input: GetBucketAclCommandInput
) => Promise<GetBucketAclCommandOutput>;

export type GetBucketEncryption = (
  input: GetBucketEncryptionCommandInput
) => Promise<GetBucketEncryptionCommandOutput>;

export type GetBucketPolicy = (
  input: GetBucketPolicyCommandInput
) => Promise<GetBucketPolicyCommandOutput>;

export type DeleteBucketPolicy = (
  input: DeleteBucketPolicyCommandInput
) => Promise<DeleteBucketPolicyCommandOutput>;

export type SetBucketPolicy = (
  input: PutBucketPolicyCommandInput
) => Promise<PutBucketPolicyCommandOutput>;

export type GetBucketTagging = (
  input: GetBucketTaggingCommandInput
) => Promise<GetBucketTaggingCommandOutput>;

export type GetBucketVersioning = (
  input: GetBucketVersioningCommandInput
) => Promise<GetBucketVersioningCommandOutput>;

export type PutBucketVersioning = (
  input: PutBucketVersioningCommandInput
) => Promise<PutBucketVersioningCommandOutput>;

export type ListBuckets = (
  input: ListBucketsCommandInput
) => Promise<ListBucketsCommandOutput>;

export type PutBucketTags = (
  input: PutBucketTaggingCommandInput
) => Promise<PutBucketTaggingCommandOutput>;

export type GetBucketLifecycleConfiguration = (
  input: GetBucketLifecycleConfigurationCommandInput
) => Promise<GetBucketLifecycleConfigurationCommandOutput>;

export type PutBucketLifecycleConfiguration = (
  input: PutBucketLifecycleConfigurationCommandInput
) => Promise<PutBucketLifecycleConfigurationCommandOutput>;

export type GetBucketCors = (
  input: GetBucketCorsCommandInput
) => Promise<GetBucketCorsCommandOutput>;

export type PutBucketCors = (
  input: PutBucketCorsCommandInput
) => Promise<PutBucketCorsCommandOutput>;

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
  | ListBucketsCommandOutput
  | ListObjectVersionsCommandOutput;

export type ListObjectsV2 = (
  input: ListObjectsV2CommandInput
) => Promise<ListObjectsV2CommandOutput>;

export type ListObjectVersions = (
  input: ListObjectVersionsCommandInput
) => Promise<ListObjectVersionsCommandOutput>;

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
