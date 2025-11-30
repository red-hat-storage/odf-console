import { ODF_PROXY_ROOT_PATH } from '@odf/shared/constants/common';

export const USERS_CREATE_PAGE_PATH = '/odf/object-storage/iam/createUserForm';

export const LIST_USERS = 'LIST_USERS_CACHE_KEY';
export const LIST_USER = 'LIST_USER_CACHE_KEY';
export const LIST_USER_TAGS = 'LIST_USER_TAGS_CACHE_KEY';
export const LIST_ACCESS_KEYS = 'LIST_ACCESS_KEYS_CACHE_KEY';

export const MAX_USERS = 10;
export const MAX_ACCESS_KEYS = 2;

export const ODF_S3_IAM_PROXY_PATH = `${ODF_PROXY_ROOT_PATH}/iam`;
export const S3_IAM_INTERNAL_ENDPOINT_PREFIX = 'https://iam.';
export const S3_IAM_INTERNAL_ENDPOINT_PORT = 443;
export const S3_IAM_INTERNAL_ENDPOINT_SUFFIX = '.svc.cluster.local';
export const S3_IAM_LOCAL_ENDPOINT = 'http://localhost:6003';

export const S3_IAM_BASE_ROUTE = '/odf/s3-iam';

//tags
export const MAX_TAGS = 50;

export const IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY =
  'console.iamUsersBookmarks';
export const DELETE = 'delete';
