import { ListIndexesCommandOutput } from '@aws-sdk/client-s3vectors';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export const convertVectorIndexesToCrFormat = (
  listVectorIndexesCommandOutput: ListIndexesCommandOutput
): K8sResourceCommon[] =>
  listVectorIndexesCommandOutput?.indexes?.map((index) => ({
    metadata: {
      uid: index.indexArn ?? '',
      name: index.indexName ?? '',
      creationTimestamp: index.creationTime?.toISOString() ?? '',
    },
  })) ?? [];
