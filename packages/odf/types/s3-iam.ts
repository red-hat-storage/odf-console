// Type definitions for S3 IAM operations
import * as Yup from 'yup';

// Key-Value pair for tags
export type KeyValuePair = {
  Key: string;
  Value: string;
};

// IAM User Form validation types
export type IamUserFormSchema = Yup.ObjectSchema<{
  userName: Yup.StringSchema;
}>;

export type IamUserFormValidation = {
  userFormSchema: IamUserFormSchema;
  fieldRequirements: string[];
};
