import { AccessKeyMetadata, User } from '@aws-sdk/client-iam';

export type IAMUsers = {
  userDetails: User;
  accessKeys?: AccessKeyMetadata[];
};
