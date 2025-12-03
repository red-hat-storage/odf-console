export const USERS_CREATE_PAGE_PATH = '/odf/object-storage/iam/createUserForm';
export const IAM_BASE_ROUTE = '/odf/iam';

export const LIST_IAM_USERS = 'LIST_IAM_USERS_CACHE_KEY';
export const LIST_IAM_USER = 'LIST_IAM_USER_CACHE_KEY';
export const LIST_IAM_USER_TAGS = 'LIST_IAM_USER_TAGS_CACHE_KEY';
export const LIST_IAM_USER_ACCESS_KEYS = 'LIST_IAM_USER_ACCESS_KEYS_CACHE_KEY';

export const MAX_USERS = 50;
export const MAX_ACCESS_KEYS = 2;

export const MAX_TAGS = 50;

export const IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY =
  'console.iamUsersBookmarks';

export enum AccessKeyStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}
