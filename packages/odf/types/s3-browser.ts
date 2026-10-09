import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type ObjectCrFormat = K8sResourceCommon & {
  apiResponse?: {
    size?: string;
    lastModified?: string;
    ownerName?: string;
    versionId?: string;
    // raw S3 storage class e.g. 'DEEP_ARCHIVE' | 'STANDARD' | ... (undefined when not provided)
    storageClass?: string;
    // restore state of an archived object, when the response reports it (either
    // the list RestoreStatus attribute or the HeadObject "x-amz-restore" header)
    restoreStatus?: {
      isRestoreInProgress?: boolean;
      restoreExpiryDate?: string;
    };
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

export enum S3ProviderType {
  Noobaa = 'noobaa',
  RgwInt = 'rgwInternal',
  RgwExt = 'rgwExternal',
}

export enum CreationMethod {
  OBC = 'obc',
  S3 = 's3',
}
