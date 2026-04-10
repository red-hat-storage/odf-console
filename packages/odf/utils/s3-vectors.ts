import {
  ListVectorBucketsCommandOutput,
  ListIndexesCommandOutput,
} from '@aws-sdk/client-s3vectors';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export const convertVectorBucketDataToCrFormat = (
  listVectorBucketsCommandOutput: ListVectorBucketsCommandOutput
): K8sResourceCommon[] =>
  listVectorBucketsCommandOutput?.vectorBuckets?.map((bucket) => ({
    metadata: {
      uid: bucket.vectorBucketName,
      name: bucket.vectorBucketName,
      creationTimestamp: bucket?.creationTime?.toString(),
    },
  })) || [];

export const convertVectorIndexesToCrFormat = (
  listVectorIndexesCommandOutput: ListIndexesCommandOutput
): K8sResourceCommon[] =>
  listVectorIndexesCommandOutput?.indexes?.map((index) => ({
    metadata: {
      uid: index.indexName,
      name: index.indexName,
      creationTimestamp: index.creationTime?.toString(),
    },
  })) ?? [];
