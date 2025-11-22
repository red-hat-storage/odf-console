import {
  GetUserCommandInput,
  GetUserCommandOutput,
  ListAccessKeysCommandInput,
  ListAccessKeysCommandOutput,
  ListUsersCommandInput,
  ListUsersCommandOutput,
  ListUserTagsCommandInput,
  ListUserTagsCommandOutput,
  DeleteUserCommandInput,
  DeleteUserCommandOutput,
  UpdateAccessKeyCommandInput,
  UpdateAccessKeyCommandOutput,
  DeleteAccessKeyCommandInput,
  DeleteAccessKeyCommandOutput,
  CreateAccessKeyCommandInput,
  CreateAccessKeyCommandOutput,
} from '@aws-sdk/client-iam';

// IAM
export type GetUser = (
  input: GetUserCommandInput
) => Promise<GetUserCommandOutput>;

export type ListUsers = (
  input: ListUsersCommandInput
) => Promise<ListUsersCommandOutput>;

export type ListAccessKeys = (
  input: ListAccessKeysCommandInput
) => Promise<ListAccessKeysCommandOutput>;

export type ListUserTags = (
  input: ListUserTagsCommandInput
) => Promise<ListUserTagsCommandOutput>;

export type DeleteUser = (
  input: DeleteUserCommandInput
) => Promise<DeleteUserCommandOutput>;

export type CreateAccessKey = (
  input: CreateAccessKeyCommandInput
) => Promise<CreateAccessKeyCommandOutput>;

export type UpdateAccessKey = (
  input: UpdateAccessKeyCommandInput
) => Promise<UpdateAccessKeyCommandOutput>;

export type DeleteAccessKey = (
  input: DeleteAccessKeyCommandInput
) => Promise<DeleteAccessKeyCommandOutput>;
