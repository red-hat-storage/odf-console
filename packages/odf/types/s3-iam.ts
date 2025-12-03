import { User } from '@aws-sdk/client-iam';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type IamUserCrFormat = K8sResourceCommon & User;
