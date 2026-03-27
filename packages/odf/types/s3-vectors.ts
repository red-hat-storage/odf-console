import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type VectorCrFormat = K8sResourceCommon & {
  apiResponse?: {
    arn?: string;
  };
};
