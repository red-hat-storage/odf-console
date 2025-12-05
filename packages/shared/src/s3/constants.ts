import { ODF_PROXY_ROOT_PATH } from '@odf/shared/constants/common';

// ToDo (Sanjal): Change the proxy path to "noobaaS3" instead of just "s3"
export const NOOBAA_S3_PROXY_PATH = `${ODF_PROXY_ROOT_PATH}/s3`;
export const RGW_INTERNAL_S3_PROXY_PATH = `${ODF_PROXY_ROOT_PATH}/internalRgwS3`;
export const S3_INTERNAL_ENDPOINT_PORT = 443;
export const NOOBAA_S3_INTERNAL_ENDPOINT_PREFIX = 'https://s3.';
export const NOOBAA_S3_INTERNAL_ENDPOINT_SUFFIX = '.svc.cluster.local';
export const S3_LOCAL_ENDPOINT = 'http://localhost:6003';
