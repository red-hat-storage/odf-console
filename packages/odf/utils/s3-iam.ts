import { ListUsersCommandOutput } from '@aws-sdk/client-iam';
import { IamUserCrFormat } from '../types';

export const convertUsersDataToCrFormat = (
  listUsersCommandOutput: ListUsersCommandOutput
): IamUserCrFormat[] =>
  listUsersCommandOutput?.Users.map((user) => ({
    metadata: {
      name: user.UserName,
      uid: user.UserId,
      creationTimestamp: user.CreateDate.toString(),
    },
    ...user,
  })) || [];
