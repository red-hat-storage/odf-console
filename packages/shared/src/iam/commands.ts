import {
  IAMClient,
  GetUserCommand,
  ListUsersCommand,
  ListAccessKeysCommand,
  ListUserTagsCommand,
  DeleteUserCommand,
  UpdateAccessKeyCommand,
} from '@aws-sdk/client-iam';
import {
  GetUser,
  ListUsers,
  ListAccessKeys,
  ListUserTags,
  DeleteUser,
  UpdateAccessKey,
} from './types';

export class S3IAMCommands extends IAMClient {
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

  // IAM command members
  getIAMUser: GetUser = (input) => this.send(new GetUserCommand(input));

  listIAMUsers: ListUsers = (input) => this.send(new ListUsersCommand(input));

  listAccessKeys: ListAccessKeys = (input) =>
    this.send(new ListAccessKeysCommand(input));

  listUserTags: ListUserTags = (input) =>
    this.send(new ListUserTagsCommand(input));

  deleteIAMUser: DeleteUser = (input) =>
    this.send(new DeleteUserCommand(input));

  updateAccessKey: UpdateAccessKey = (input) =>
    this.send(new UpdateAccessKeyCommand(input));
}
