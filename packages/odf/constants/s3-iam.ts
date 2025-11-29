export const USERS_CREATE_PAGE_PATH = '/odf/object-storage/iam/createUserForm';
export const IAM_BASE_ROUTE = '/odf/iam';

export const LIST_USERS = 'LIST_USERS_CACHE_KEY';
export const LIST_USER = 'LIST_USER_CACHE_KEY';
export const LIST_USER_TAGS = 'LIST_USER_TAGS_CACHE_KEY';
export const LIST_ACCESS_KEYS = 'LIST_ACCESS_KEYS_CACHE_KEY';

export const MAX_USERS = 10;
export const MAX_ACCESS_KEYS = 2;

//tags
export const MAX_TAGS = 50;

export const IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY =
  'console.iamUsersBookmarks';

// Access key status enum
export enum AccessKeyStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}
