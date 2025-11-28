import { AccessKeyMetadata, User } from '@aws-sdk/client-iam';
import { IamCommands } from '@odf/shared/iam';

export type IAMUsers = {
  userDetails: User;
  accessKeys?: AccessKeyMetadata[];
};

export type IAMUserDetails = {
  fresh: boolean;
  triggerRefresh: () => void;
  userName: string;
  iamClient: IamCommands;
};
