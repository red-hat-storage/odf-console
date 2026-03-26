import { ListVectorBucketsCommandOutput } from '@aws-sdk/client-s3vectors';
import { VectorBucketCrFormat } from '../types/s3-vectors';

export const convertVectorBucketDataToCrFormat = (
  listVectorBucketsCommandOutput: ListVectorBucketsCommandOutput
): VectorBucketCrFormat[] =>
  listVectorBucketsCommandOutput?.vectorBuckets.map((bucket) => ({
    metadata: {
      name: bucket.vectorBucketName,
      creationTimestamp: bucket.creationTime.toString(),
    },
    apiResponse: {
      arn: bucket.vectorBucketArn,
    },
  })) || [];
