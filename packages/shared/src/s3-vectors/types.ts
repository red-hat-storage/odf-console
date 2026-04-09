import {
  CreateIndexCommandInput,
  CreateIndexCommandOutput,
  CreateVectorBucketCommandInput,
  CreateVectorBucketCommandOutput,
  DeleteIndexCommandInput,
  DeleteIndexCommandOutput,
  DeleteVectorBucketCommandInput,
  DeleteVectorBucketCommandOutput,
  DeleteVectorBucketPolicyCommandInput,
  GetIndexCommandInput,
  GetIndexCommandOutput,
  GetVectorBucketPolicyCommandInput,
  GetVectorBucketPolicyCommandOutput,
  ListIndexesCommandInput,
  ListIndexesCommandOutput,
  ListVectorBucketsCommandInput,
  ListVectorBucketsCommandOutput,
  PutVectorBucketPolicyCommandInput,
  PutVectorBucketPolicyCommandOutput,
} from '@aws-sdk/client-s3vectors';

// Vector bucket command types (NooBaa: extra fields are applied as HTTP headers, not sent in the body)
export type CreateVectorBucketInputWithHeaders =
  CreateVectorBucketCommandInput & {
    /** Sent as `x-noobaa-custom-nsr`. */
    namespaceStoreFilesystem: string;
    /** Sent as `x-noobaa-custom-bucket-path`. */
    subpath?: string;
  };

export type CreateVectorBucket = (
  input: CreateVectorBucketInputWithHeaders
) => Promise<CreateVectorBucketCommandOutput>;

export type ListVectorBuckets = (
  input: ListVectorBucketsCommandInput
) => Promise<ListVectorBucketsCommandOutput>;

export type DeleteVectorBucket = (
  input: DeleteVectorBucketCommandInput
) => Promise<DeleteVectorBucketCommandOutput>;

export type GetVectorBucketPolicy = (
  input: GetVectorBucketPolicyCommandInput
) => Promise<GetVectorBucketPolicyCommandOutput>;

export type SetVectorBucketPolicy = (
  input: PutVectorBucketPolicyCommandInput
) => Promise<PutVectorBucketPolicyCommandOutput>;

export type DeleteVectorBucketPolicy = (
  input: DeleteVectorBucketPolicyCommandInput
) => Promise<DeleteVectorBucketCommandOutput>;

// Vector index command types
export type CreateIndex = (
  input: CreateIndexCommandInput
) => Promise<CreateIndexCommandOutput>;

export type ListIndexes = (
  input: ListIndexesCommandInput
) => Promise<ListIndexesCommandOutput>;

export type DeleteIndex = (
  input: DeleteIndexCommandInput
) => Promise<DeleteIndexCommandOutput>;

export type GetIndex = (
  input: GetIndexCommandInput
) => Promise<GetIndexCommandOutput>;
