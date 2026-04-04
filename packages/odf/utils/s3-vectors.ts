import { ListVectorBucketsCommandOutput } from '@aws-sdk/client-s3vectors';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export const convertVectorBucketDataToCrFormat = (
  listVectorBucketsCommandOutput: ListVectorBucketsCommandOutput
): K8sResourceCommon[] =>
  listVectorBucketsCommandOutput?.vectorBuckets.map((bucket) => ({
    metadata: {
      uid: bucket.vectorBucketArn,
      name: bucket.vectorBucketName,
      creationTimestamp: bucket.creationTime.toString(),
    },
  })) || [];
