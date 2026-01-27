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
  CreateUserCommandInput,
  CreateUserCommandOutput,
  TagUserCommandInput,
  TagUserCommandOutput,
  PutUserPolicyCommandInput,
  PutUserPolicyCommandOutput,
  DeleteUserPolicyCommandInput,
  DeleteUserPolicyCommandOutput,
  UntagUserCommandInput,
  UntagUserCommandOutput,
  ListUserPoliciesCommandInput,
  ListUserPoliciesCommandOutput,
} from '@aws-sdk/client-iam';

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

export type CreateUser = (
  input: CreateUserCommandInput
) => Promise<CreateUserCommandOutput>;

export type TagUser = (
  input: TagUserCommandInput
) => Promise<TagUserCommandOutput>;

export type PutUserPolicy = (
  input: PutUserPolicyCommandInput
) => Promise<PutUserPolicyCommandOutput>;

export type DeleteUserPolicy = (
  input: DeleteUserPolicyCommandInput
) => Promise<DeleteUserPolicyCommandOutput>;

export type UntagUser = (
  input: UntagUserCommandInput
) => Promise<UntagUserCommandOutput>;

export type ListUserPolicies = (
  input: ListUserPoliciesCommandInput
) => Promise<ListUserPoliciesCommandOutput>;
