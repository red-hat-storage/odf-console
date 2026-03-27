import {
  ListIndexesCommandOutput,
  ListVectorBucketsCommandOutput,
} from '@aws-sdk/client-s3vectors';
import { VectorCrFormat } from '../types/s3-vectors';

export const convertVectorBucketDataToCrFormat = (
  listVectorBucketsCommandOutput: ListVectorBucketsCommandOutput
): VectorCrFormat[] =>
  listVectorBucketsCommandOutput?.vectorBuckets?.map((bucket) => ({
    metadata: {
      uid: bucket.vectorBucketArn,
      name: bucket.vectorBucketName,
      creationTimestamp: bucket.creationTime.toString(),
    },
    apiResponse: {
      arn: bucket.vectorBucketArn,
    },
  })) || [];

export const convertVectorIndexesToCrFormat = (
  listVectorIndexesCommandOutput: ListIndexesCommandOutput
): VectorCrFormat[] =>
  listVectorIndexesCommandOutput?.indexes?.map((index) => ({
    metadata: {
      uid: index.indexArn,
      name: index.indexName ?? '',
      creationTimestamp: index.creationTime?.toISOString() ?? '',
    },
  })) || [];
