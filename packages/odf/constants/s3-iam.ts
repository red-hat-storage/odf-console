export const USERS_CREATE_PAGE_PATH = '/odf/object-storage/iam/create-user';
export const IAM_BASE_ROUTE = '/odf/object-storage/iam';

export const GET_IAM_USER = 'GET_IAM_USER_CACHE_KEY';

export const LIST_IAM_USERS = 'LIST_IAM_USERS_CACHE_KEY';
export const LIST_IAM_USER_TAGS = 'LIST_IAM_USER_TAGS_CACHE_KEY';
export const LIST_IAM_USER_ACCESS_KEYS = 'LIST_IAM_USER_ACCESS_KEYS_CACHE_KEY';

// SWR mutation keys
export const CREATE_IAM_USER_MUTATION_KEY = 'create-iam-user';

export const MAX_USERS = 50;
export const MAX_ACCESS_KEYS = 2;

export const MAX_TAGS = 50;

export const IAM_USERS_BOOKMARKS_USER_SETTINGS_KEY =
  'console.iamUsersBookmarks';

export enum AccessKeyStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

// Tag validation constants
export const TAG_KEY_MIN_LENGTH = 1;
export const TAG_KEY_MAX_LENGTH = 128;
export const TAG_VALUE_MAX_LENGTH = 256;
export const TAG_ALLOWED_CHARS_REGEX = /^[\p{L}\p{Z}\p{N}_.:/=+\-@]+$/u;
export const TAG_VALUE_ALLOWED_CHARS_REGEX = /^[\p{L}\p{Z}\p{N}_.:/=+\-@]*$/u;

// Username validation constants
export const USER_NAME_MIN_LENGTH = 1;
export const USER_NAME_MAX_LENGTH = 64;
export const USER_NAME_ALLOWED_CHARS_REGEX = /^[A-Za-z0-9+=,.@_-]*$/;

//default IAM policy for a user
export const POLICY_DOCUMENT =
  '{ "Version": "2012-10-17", "Statement": [ { "Effect": "Allow", "Action": [ "s3:*" ], "Resource": "*" } ] }';
export const POLICY_NAME = 'policy_allow_all_s3_actions';
