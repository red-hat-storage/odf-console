import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { APPLICATION_TYPE, REPLICATION_TYPE } from '../../../../constants';

export type PlacementType = K8sResourceCommon & {
  deploymentClusters: string[];
};

export type DRPlacementControlType = K8sResourceCommon & {
  drPolicyRef: ObjectReference;
  placementInfo: PlacementType;
  pvcSelector?: string[];
  lastGroupSyncTime?: string;
  status?: string;
};

export type PolicyType = K8sResourceCommon & {
  assignedOn: string;
  activity?: string;
  isValidated: boolean;
};

export type DRPolicyType = PolicyType & {
  schedulingInterval: string;
  replicationType: REPLICATION_TYPE;
  drClusters: string[];
  placementControlInfo?: DRPlacementControlType[];
};

export type DataPolicyType = DRPolicyType;

export type ApplicationType = K8sResourceCommon & {
  type: APPLICATION_TYPE;
  workloadNamespace: string;
  placements: PlacementType[];
  dataPolicies?: DataPolicyType[];
};

export type ApplicationInfoType = ApplicationType | {};
