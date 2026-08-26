import { K8sResourceCondition } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type SubmarinerAddOnKind = K8sResourceCommon & {
  status?: {
    conditions?: K8sResourceCondition[];
  };
};

export type SubmarinerBrokerKind = K8sResourceCommon & {
  spec?: {
    globalnetEnabled?: boolean;
  };
};

export type SubmarinerClusterKind = K8sResourceCommon & {
  spec?: {
    cluster_id?: string;
    cluster_cidr?: string[];
    service_cidr?: string[];
  };
};

export type ClusterNetworkCidrs = {
  clusterCidrs: string[];
  serviceCidrs: string[];
};
