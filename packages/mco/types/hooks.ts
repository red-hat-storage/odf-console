import { ObjectReference } from '@openshift-console/dynamic-plugin-sdk';
import {
  ACMApplicationKind,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
} from './acm';
import { ArgoApplicationSetKind } from './argo-cd';
import { DRClusterKind, DRPlacementControlKind, DRPolicyKind } from './ramen';

export type AppDeploymentProps = {
  placementInfo: {
    placement: ACMPlacementKind;
    placementDecision: ACMPlacementDecisionKind;
  };
  drInfo: {
    drPolicy?: DRPolicyKind;
    drClusters?: DRClusterKind[];
    drPlacementControl?: DRPlacementControlKind;
  };
};

export type ApplicationProps = {
  application: ACMApplicationKind;
  deploymentInfo: AppDeploymentProps[];
};

// Common application parser result type
export type ApplicationResourceType = {
  applicationInfo: ApplicationProps;
  siblingApplications: ACMApplicationKind[];
};

export type DRResourceType = {
  drPolicy?: DRPolicyKind;
  drClusters?: DRClusterKind[];
  drPlacementControls?: DRPlacementControlKind[];
};

export type ApplicationRefKind = {
  applicationName: string;
  applicationNamespace: string;
  applicationType: string;
  workLoadNamespace: string;
  drPolicyRefs?: string[];
  placementRef?: ObjectReference[];
};

// Common watch type for dr resources
export type WatchDRResourceType = {
  drPolicies: DRPolicyKind[];
  drClusters: DRClusterKind[];
  drPlacementControls: DRPlacementControlKind[];
};

// Common watch type for placements
export type WatchPlacementResourceType = {
  placements: ACMPlacementKind[];
  placementDecisions: ACMPlacementDecisionKind[];
};

// Common watch type for argo app sets
export type WatchArgoAppSetResourceType = WatchPlacementResourceType & {
  applications: ArgoApplicationSetKind[];
};
