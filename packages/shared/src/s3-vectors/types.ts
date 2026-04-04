import type {
  DeleteVectorBucketCommandInput,
  DeleteVectorBucketCommandOutput,
  ListIndexesCommandInput,
  ListIndexesCommandOutput,
  ListVectorBucketsCommandInput,
  ListVectorBucketsCommandOutput,
} from '@aws-sdk/client-s3vectors';

export type ListVectorBuckets = (
  input: ListVectorBucketsCommandInput
) => Promise<ListVectorBucketsCommandOutput>;

export type ListIndexes = (
  input: ListIndexesCommandInput
) => Promise<ListIndexesCommandOutput>;

export type DeleteVectorBucket = (
  input: DeleteVectorBucketCommandInput
) => Promise<DeleteVectorBucketCommandOutput>;
