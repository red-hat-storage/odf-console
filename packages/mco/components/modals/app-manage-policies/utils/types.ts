import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { DRApplication, ReplicationType } from '../../../../constants';

export type PlacementType = K8sResourceCommon & {
  deploymentClusters: string[];
};

export type DRPlacementControlType = K8sResourceCommon & {
  // The reference to the DRPolicy participating in the DR replication
  drPolicyRef: ObjectReference;
  // The PlacementRule/Placement information used by DRPC
  placementInfo: PlacementType;
  // To identify all the PVCs that need DR protection.
  pvcSelector?: string[];
  // Volume replication group last successful sync completion time
  lastGroupSyncTime?: string;
  // The time of the most recent successful kube object protection
  lastKubeObjectProtectionTime?: string;
  // Name of the Recipe
  recipeName?: string;
  // Namespace of the Recipe
  recipeNamespace?: string;
  // List of VM names that belong to a shared VM group
  vmSharedGroup?: string[];
  // Name of the shared VM group
  vmSharedGroupName?: string;
  // K8s objects replication interval
  k8sResourceSyncInterval?: string;
};

export type DRPolicyType = K8sResourceCommon & {
  // The time of DR protection is enabled
  assignedOn?: string;
  // Is DRPolicy is validated or not
  isValidated: boolean;
  // Volume replication interval, only applicable for RDR(Async)
  schedulingInterval: string;
  // Type of replication async(RDR)/sync(MDR)
  replicationType: ReplicationType;
  // Peer clusters info
  drClusters: string[];
};

export type DRInfoType = {
  // Policy Info
  drPolicyInfo: DRPolicyType;
  // Only Subscription can have more than one DRPC
  placementControlInfo?: DRPlacementControlType[];
};

export type PVCQueryFilter = { property: string; values: string[] | string }[];

export type ApplicationType = K8sResourceCommon & {
  // ACM managed application types
  type: DRApplication;
  // Remote workload namespace
  workloadNamespace: string;
  // Cluster info, Only Subscription application can have more than one placements
  placements: PlacementType[];
  // Disaster recovery info
  drInfo?: DRInfoType | {};
  // ACM search API filter to read application PVCs
  pvcQueryFilter: PVCQueryFilter;
};

export type ApplicationInfoType = ApplicationType | {};

export enum ModalType {
  Application = 'Application',
  VirtualMachine = 'VirtualMachine',
}

export enum VMProtectionType {
  STANDALONE = 'STANDALONE',
  SHARED = 'SHARED',
}
