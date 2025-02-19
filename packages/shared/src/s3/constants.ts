import { ODF_PROXY_ROOT_PATH } from '@odf/shared/constants/common';

export const ODF_S3_PROXY_PATH = `${ODF_PROXY_ROOT_PATH}/s3`;
export const S3_INTERNAL_ENDPOINT_PORT = 443;
export const S3_INTERNAL_ENDPOINT_PREFIX = 'https://s3.';
export const S3_INTERNAL_ENDPOINT_SUFFIX = '.svc.cluster.local';
export const S3_LOCAL_ENDPOINT = 'http://localhost:6001';
