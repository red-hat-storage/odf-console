import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type VectorBucketCrFormat = K8sResourceCommon & {
  apiResponse?: {
    arn?: string;
  };
};
