import { ODF_PROXY_ROOT_PATH } from '@odf/shared/constants/common';

export const NOOBAA_S3_VECTORS_PROXY_PATH = `${ODF_PROXY_ROOT_PATH}/s3Vector`;
export const NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_PREFIX = 'https://vectors.';
export const NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_SUFFIX = '.svc.cluster.local';
export const S3_VECTORS_LOCAL_ENDPOINT = 'http://localhost:6009';

// CreateVectorBucket Custom Headers
export const NOOBAA_CUSTOM_NS_HEADER = 'x-noobaa-nsr';
export const NOOBAA_CUSTOM_SUBPATH_HEADER = 'x-noobaa-custom-bucket-path';
