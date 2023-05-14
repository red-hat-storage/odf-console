import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { DRClusterStatus } from '../components/modals/app-failover-relocate/subscriptions/target-cluster-selector';
import { DRActionType, DRPC_STATUS, REPLICATION_TYPE } from '../constants';

export type DRClusterInfo = K8sResourceCommon & {
  status?: {
    phase: DRClusterStatus;
  };
};

export type DisasterRecoveryInfoType = K8sResourceCommon & {
  failoverCluster?: string;
  preferedCluster?: string;
  action?: DRActionType;
  status?: {
    isPeerReady?: boolean;
    isAvailable?: boolean;
    lastGroupSyncTime?: string;
    phase?: DRPC_STATUS;
  };
  policyInfo?: K8sResourceCommon & {
    replicationType?: REPLICATION_TYPE;
  };
  placementInfo?: ObjectReference;
  drClusterInfo?: DRClusterInfo[];
};

export type PlacementInfoType = K8sResourceCommon & {
  deploymentClusters?: string[];
};

export type SubscriptionInfoType = {
  subscriptions: K8sResourceCommon[];
  placementInfo?: PlacementInfoType;
  disasterRecoveryInfo?: DisasterRecoveryInfoType;
};

type ApplicationInfoType = K8sResourceCommon;

// Custom subscription info type
export type SubscriptionAppInfo = {
  applicationInfo?: ApplicationInfoType;
  subscriptionInfo?: SubscriptionInfoType[];
};
