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
  GetVectorBucketPolicyCommandInput,
  GetVectorBucketPolicyCommandOutput,
  ListIndexesCommandInput,
  ListIndexesCommandOutput,
  ListVectorBucketsCommandInput,
  ListVectorBucketsCommandOutput,
  ListVectorsCommandInput,
  ListVectorsCommandOutput,
  PutVectorBucketPolicyCommandInput,
  PutVectorBucketPolicyCommandOutput,
} from '@aws-sdk/client-s3vectors';

//Vector buckets command types
export type CreateVectorBucket = (
  input: CreateVectorBucketCommandInput
) => Promise<CreateVectorBucketCommandOutput>;

export type ListVectorBuckets = (
  input: ListVectorBucketsCommandInput
) => Promise<ListVectorBucketsCommandOutput>;

export type DeleteVectorBucket = (
  input: DeleteVectorBucketCommandInput
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

export type ListVectors = (
  input: ListVectorsCommandInput
) => Promise<ListVectorsCommandOutput>;

export type GetVectorBucketPolicy = (
  input: GetVectorBucketPolicyCommandInput
) => Promise<GetVectorBucketPolicyCommandOutput>;

export type SetVectorBucketPolicy = (
  input: PutVectorBucketPolicyCommandInput
) => Promise<PutVectorBucketPolicyCommandOutput>;

export type DeleteVectorBucketPolicy = (
  input: DeleteVectorBucketPolicyCommandInput
) => Promise<DeleteVectorBucketCommandOutput>;
