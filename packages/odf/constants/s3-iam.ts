// Core IAM limits
export const MAX_USERS = 10;
export const MAX_ACCESS_KEYS = 2;

// Username validation constants
export const USER_NAME_MIN_LENGTH = 1;
export const USER_NAME_MAX_LENGTH = 64;
export const USER_NAME_ALLOWED_CHARS_REGEX = /^[A-Za-z0-9+=,.@_-]*$/;

// Tag validation constants
export const MAX_TAGS = 50;
export const TAG_KEY_MIN_LENGTH = 1;
export const TAG_KEY_MAX_LENGTH = 128;
export const TAG_VALUE_MAX_LENGTH = 256;
export const TAG_ALLOWED_CHARS_REGEX = /^[\p{L}\p{Z}\p{N}_.:/=+\-@]+$/u;
export const TAG_VALUE_ALLOWED_CHARS_REGEX = /^[\p{L}\p{Z}\p{N}_.:/=+\-@]*$/u;

// Cache keys
export const LIST_USERS = 'LIST_USERS_CACHE_KEY';
export const LIST_USER = 'LIST_USER_CACHE_KEY';
export const LIST_USER_TAGS = 'LIST_USER_TAGS_CACHE_KEY';
export const LIST_ACCESS_KEYS = 'LIST_ACCESS_KEYS_CACHE_KEY';

// Enums
export enum AccessKeyStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

// Common constants
export const DELETE = 'delete';

// UI Routes
export const IAM_BASE_ROUTE = '/odf/object-storage/iam';
export const USERS_CREATE_PAGE_PATH = '/odf/object-storage/iam/create-user';

// UI Bookmarking
export const IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY =
  'console.iamUsersBookmarks';
