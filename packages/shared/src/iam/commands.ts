import {
  IAMClient,
  GetUserCommand,
  ListUsersCommand,
  ListAccessKeysCommand,
  ListUserTagsCommand,
  DeleteUserCommand,
  UpdateAccessKeyCommand,
  DeleteAccessKeyCommand,
  CreateAccessKeyCommand,
  CreateUserCommand,
  TagUserCommand,
  PutUserPolicyCommand,
  DeleteUserPolicyCommand,
  UntagUserCommand,
  ListUserPoliciesCommand,
} from '@aws-sdk/client-iam';
import {
  GetUser,
  ListUsers,
  ListAccessKeys,
  ListUserTags,
  DeleteUser,
  UpdateAccessKey,
  DeleteAccessKey,
  CreateAccessKey,
  CreateUser,
  TagUser,
  PutUserPolicy,
  DeleteUserPolicy,
  UntagUser,
  ListUserPolicies,
} from './types';

export class IamCommands extends IAMClient {
  constructor(endpoint: string, accessKeyId: string, secretAccessKey: string) {
    super({
      // "region" is a required parameter for the SDK, using "none" as a workaround
      region: 'none',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  getIamUser: GetUser = (input) => this.send(new GetUserCommand(input));

  listIamUsers: ListUsers = (input) => this.send(new ListUsersCommand(input));

  listAccessKeys: ListAccessKeys = (input) =>
    this.send(new ListAccessKeysCommand(input));

  listUserTags: ListUserTags = (input) =>
    this.send(new ListUserTagsCommand(input));

  deleteIamUser: DeleteUser = (input) =>
    this.send(new DeleteUserCommand(input));

  createAccessKey: CreateAccessKey = (input) =>
    this.send(new CreateAccessKeyCommand(input));

  updateAccessKey: UpdateAccessKey = (input) =>
    this.send(new UpdateAccessKeyCommand(input));

  deleteAccessKey: DeleteAccessKey = (input) =>
    this.send(new DeleteAccessKeyCommand(input));

  createIamUser: CreateUser = (input) =>
    this.send(new CreateUserCommand(input));

  tagUser: TagUser = (input) => this.send(new TagUserCommand(input));

  putUserPolicy: PutUserPolicy = (input) =>
    this.send(new PutUserPolicyCommand(input));

  deleteUserPolicy: DeleteUserPolicy = (input) =>
    this.send(new DeleteUserPolicyCommand(input));

  untagUser: UntagUser = (input) => this.send(new UntagUserCommand(input));

  listUserPolicies: ListUserPolicies = (input) =>
    this.send(new ListUserPoliciesCommand(input));
}
