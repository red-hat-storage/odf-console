import {
  K8sResourceCommon,
  MatchLabels,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { REPLICATION_TYPE } from '../../../../constants';

export type PlacementType = K8sResourceCommon & {
  deploymentClusters?: string[];
};

export type DRPlacementControlType = K8sResourceCommon & {
  drPolicyRef: ObjectReference;
  placementInfo: PlacementType;
  pvcSelector?: {
    matchLabels: MatchLabels;
  };
  lastGroupSyncTime: string;
  status: string;
};

export type PolicyType = K8sResourceCommon & {
  assignedOn?: string;
  activity?: string;
  isValidated?: boolean;
};

export type DRPolicyType = PolicyType & {
  schedulingInterval?: string;
  replicationType?: REPLICATION_TYPE;
  drClusters?: string[];
  placementControInfo?: DRPlacementControlType[];
};

export type DataPolicyType = DRPolicyType;

export type ApplicationType = K8sResourceCommon & {
  workloadNamespace?: string;
  placements?: PlacementType[];
  dataPolicies?: DataPolicyType[];
};
