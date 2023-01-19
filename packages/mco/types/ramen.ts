import { K8sResourceCondition } from '@odf/shared/types';
import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

type ClusterStatus = {
  name: string;
  status: string;
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
    resourceConditions?: {
      properties?: {
        resourceMeta?: {
          properties?: {
            protectedpvcs?: {
              items?: string[];
            };
          };
        };
      };
    };
    phase: string;
    lastGroupSyncTime?: string;
    preferredDecision?: {
      clusterName?: string;
      clusterNamespace?: string;
    };
  };
};
