import { User, Tag } from '@aws-sdk/client-iam';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import * as Yup from 'yup';

export type IamUserCrFormat = K8sResourceCommon & User;

export type KeyValuePair = Tag;

export type IamUserFormSchema = Yup.ObjectSchema<{
  userName: string;
}>;

export type IamUserFormValidation = {
  userFormSchema: IamUserFormSchema;
  fieldRequirements: string[];
};
