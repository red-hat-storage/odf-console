import {
  ODF_PROXY_ROOT_PATH,
  S3_ENDPOINT_PROXY_ROOT_PATH,
} from '@odf/shared/constants/common';

// Provider/Hub cluster
export const NOOBAA_S3_PROXY_PATH = `${ODF_PROXY_ROOT_PATH}/s3`;
export const RGW_INTERNAL_S3_PROXY_PATH = `${ODF_PROXY_ROOT_PATH}/internalRgwS3`;
export const S3_INTERNAL_ENDPOINT_PORT = 443;
export const NOOBAA_S3_INTERNAL_ENDPOINT_PREFIX = 'https://s3.';
export const NOOBAA_S3_INTERNAL_ENDPOINT_SUFFIX = '.svc.cluster.local';
export const RGW_S3_INTERNAL_ENDPOINT_SUFFIX = '.cluster.local';
export const S3_LOCAL_ENDPOINT = 'http://localhost:6001';

// Consumer/Client cluster
export const CLIENT_NOOBAA_EXPOSED_AS = 'noobaaS3';
export const getHubS3EndpointProxyPath = (uniqueIdentifier: string) =>
  `${S3_ENDPOINT_PROXY_ROOT_PATH}/${uniqueIdentifier}/${CLIENT_NOOBAA_EXPOSED_AS}`;
