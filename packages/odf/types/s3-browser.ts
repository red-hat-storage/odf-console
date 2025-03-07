import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type ObjectCrFormat = K8sResourceCommon & {
  apiResponse?: {
    size?: string;
    lastModified?: string;
    ownerName?: string;
    versionId?: string;
  };
  isFolder?: boolean;
  isDeleteMarker?: boolean;
  isLatest?: boolean;
  type?: string;
};

export type BucketCrFormat = K8sResourceCommon & {
  apiResponse?: {
    owner?: string;
  };
};
