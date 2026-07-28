import { K8sResourceCondition } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type SubmarinerAddOnKind = K8sResourceCommon & {
  status?: {
    conditions?: K8sResourceCondition[];
  };
};
