import { K8sResourceCondition, ApplicationKind } from '@odf/shared/types';
import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

type ClusterStatus = {
  name: string;
  status: string;
};

export type PlacementDecision = {
  clusterName?: string;
  clusterNamespace?: string;
};

export type DRPolicyKind = K8sResourceCommon & {
  spec?: {
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

export type DRClusterKind = K8sResourceCommon & {
  spec?: {
    cidrs?: string[];
    clusterFence?: string;
    region?: string;
    S3ProfileName: string;
  };
  status?: {
    conditions?: K8sResourceCondition[];
    phase: string;
  };
};

export type ACMManagedClusterKind = K8sResourceCommon & {
  status?: {
    clusterClaims?: {
      name: string;
      value: string;
    }[];
    conditions?: K8sResourceCondition[];
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
    drPolicyRef: ObjectReference;
    placementRef: ObjectReference;
    preferredCluster?: string;
    failoverCluster?: string;
    pvcSelector: {
      matchLabels: {
        [key: string]: string;
      };
    };
    action?: string;
  };
  status?: {
    conditions?: K8sResourceCondition[];
    phase: string;
    lastGroupSyncTime?: string;
    preferredDecision?: PlacementDecision;
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
    decisions?: PlacementDecision[];
  };
};

export type ACMSubscriptionKind = K8sResourceCommon & {
  spec: {
    name?: string;
    placement?: {
      placementRef?: ObjectReference;
    };
  };
  status?: {
    message?: string;
    phase?: string;
    statuses?: any;
  };
};

export type AppToPlacementRule = {
  [appUniqueKey: string]: {
    application: ApplicationKind;
    placements: {
      [placementUniqueKey: string]: {
        placementRules: ACMPlacementRuleKind;
        subscriptions: ACMSubscriptionKind[];
      };
    };
  };
};
