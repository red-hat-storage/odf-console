import { K8sResourceCondition } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

type ClusterStatus = {
  name: string;
  status: string;
};

export type DRPolicyKind = K8sResourceCommon & {
  spec: {
    drClusters: string[];
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

export type ACMManagedClusterKind = K8sResourceCommon & {
  status?: {
    clusterClaims?: {
      name: string;
      value: string;
    }[];
  };
};

export type MirrorPeerKind = K8sResourceCommon & {
  spec?: {
    items: {
      clusterName: string;
      storageClusterRef: {
        name: string;
        namespace: string;
      };
    }[];
    schedulingIntervals?: string[];
    manageS3: boolean;
    type: string;
  };
};

export type DRPlacementControlKind = K8sResourceCommon & {
  spec: {
    drPolicyRef: {
      name: string;
    };
    placementRef: {
      kind: string;
      name: string;
    };
    preferredCluster?: string;
    pvcSelector: {
      matchLabels: {
        [key in string]: string;
      };
    };
  };
  status?: {
    phase: string;
  };
};

export type ACMPlacementRuleKind = K8sResourceCommon & {
  spec: {
    clusterReplicas?: number;
    clusterConditions?: {
      status: string;
      type: string;
    }[];
    clusterSelector?: Selector | null;
    schedulerName?: string;
  };
  status?: {
    decisions?: {
      clusterName: string;
      clusterNamespace: string;
    }[];
  };
};

export type ACMSubscriptionKind = K8sResourceCommon & {
  spec: {
    name?: string;
    placement?: {
      placementRef?: {
        kind: string;
        name: string;
      };
    };
  };
  status?: {
    message?: string;
    phase?: string;
    statuses?: any;
  };
};
