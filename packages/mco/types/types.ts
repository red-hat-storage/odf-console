import { K8sResourceCondition } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

type ClusterStatus = {
  name: string;
  status: string;
};

export type DRPolicyKind = K8sResourceCommon & {
  spec: {
    drClusters: string[],
    schedulingInterval: string;
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

export type ACMManagedClusterKind =  K8sResourceCommon & {
  status?: {
    clusterClaims?: {
      name: string,
      value: string
    }[]
  };
};

export type MirrorPeerKind =  K8sResourceCommon & {
  spec?: {
    items: {
      clusterName: string,
      storageClusterRef: {
        name: string,
        namespace: string
      }
    }[],
    schedulingIntervals?: string[],
    manageS3: boolean,
    type: string,
  }
};
