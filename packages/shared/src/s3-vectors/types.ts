import {
  CreateIndexCommandInput,
  CreateIndexCommandOutput,
  CreateVectorBucketCommandInput,
  CreateVectorBucketCommandOutput,
  DeleteIndexCommandInput,
  DeleteIndexCommandOutput,
  DeleteVectorBucketCommandInput,
  DeleteVectorBucketCommandOutput,
  ListIndexesCommandInput,
  ListIndexesCommandOutput,
  ListVectorBucketsCommandInput,
  ListVectorBucketsCommandOutput,
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

export type CreateIndex = (
  input: CreateIndexCommandInput
) => Promise<CreateIndexCommandOutput>;

export type ListIndexes = (
  input: ListIndexesCommandInput
) => Promise<ListIndexesCommandOutput>;

export type DeleteIndex = (
  input: DeleteIndexCommandInput
) => Promise<DeleteIndexCommandOutput>;
