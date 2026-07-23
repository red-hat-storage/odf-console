import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCondition } from '@odf/shared/types';

export type SubmarinerAddOnKind = K8sResourceCommon & {
  status?: {
    conditions?: K8sResourceCondition[];
  };
};
