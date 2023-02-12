import { K8sResourceCondition, MatchLabels } from '@odf/shared/types';
import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { DRActionType, DR_REPLICATION_STATE } from '../constants';

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
      matchLabels: MatchLabels;
    };
    action?: DRActionType;
  };
  status?: {
    conditions?: K8sResourceCondition[];
    resourceConditions?: {
      resourceMeta?: {
        protectedpvcs?: string[];
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

export type DRVolumeReplicationGroupKind = K8sResourceCommon & {
  spec: {
    action?: DRActionType;
    async?: {
      schedulingInterval?: string;
    };
  };
  status?: {
    state?: DR_REPLICATION_STATE;
    protectedPVCs?: {
      name?: string;
      protectedByVolSync?: boolean;
      storageClassName?: string;
      labels?: MatchLabels;
      accessModes?: string[];
      resources?: any;
      conditions?: K8sResourceCondition[];
      lastSyncTime?: string;
    }[];
    conditions?: K8sResourceCondition[];
    observedGeneration?: number;
    lastUpdateTime: string;
    kubeObjectProtection?: {
      captureToRecoverFrom?: {
        number: number;
        startTime: string;
      };
    };
    prepareForFinalSyncComplete?: boolean;
    finalSyncComplete?: boolean;
    lastGroupSyncTime?: string;
  };
};
