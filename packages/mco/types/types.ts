import { K8sResourceCondition } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

type ClusterStatus = {
  name: string;
  status: string;
};

export type ManagedCluster = {
  name: string;
  region: string;
  s3profileName: string;
  cidrs?: string;
  clusterFence?: string;
};

export type DRPolicyKind = K8sResourceCommon & {
  spec: {
    drClusterSet: ManagedCluster[];
    schedulingInterval?: string;
    replicationClassSelector?: Selector;
  };
  status?: {
    conditions?: K8sResourceCondition[];
    drClusters?: {
      [key: string]: ClusterStatus;
    };
    phase: string;
  };
};
