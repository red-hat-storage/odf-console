import { K8sResourceCondition, ApplicationKind } from '@odf/shared/types';
import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { ArgoApplicationSetKind } from './argo-cd';

export type ClusterClaim = {
  name: string;
  value: string;
};

export type ACMManagedClusterKind = K8sResourceCommon & {
  status?: {
    clusterClaims?: ClusterClaim[];
    conditions?: K8sResourceCondition[];
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
      clusterName?: string;
      clusterNamespace?: string;
    }[];
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

export type ACMPlacementKind = K8sResourceCommon & {
  spec: {
    numberOfClusters?: number;
    clusterSets?: string[];
    predicates?: {
      requiredClusterSelector: {
        labelSelector?: Selector;
        claimSelector?: Selector;
      };
    }[];
    clusterSelector?: Selector | null;
  };
  status?: {
    conditions: K8sResourceCondition[];
    numberOfSelectedClusters?: number;
  };
};

export type ACMPlacementDecisionKind = K8sResourceCommon & {
  status?: {
    decisions: {
      // ClusterDecision represents a decision from a placement
      clusterName: string;
      reason: string;
    }[];
  };
};

export type ACMPlacementType = ACMPlacementRuleKind | ACMPlacementKind;

export type PlacementInfoType = {
  [placementUniqueKey: string]: {
    placement: ACMPlacementType;
    subscriptions: ACMSubscriptionKind[];
    deploymentClusterName: string;
  };
};

export type AppToPlacementType = {
  [appUniqueKey: string]: {
    application: ApplicationKind;
    placements: PlacementInfoType;
  };
};

export type ACMMultiClusterObservability = K8sResourceCommon & {
  status?: {
    conditions: K8sResourceCondition[];
  };
};

export type ACMApplicationKind = ArgoApplicationSetKind | ApplicationKind;

export type PlacementToAppSets = {
  namespace: string;
  placement: string;
  havePlacementAnnotations: boolean;
  isAlreadyProtected: boolean;
  appSetName: string;
  placementDecision: string;
  decisionClusters: string[];
  selected: boolean;
  isVisible: boolean;
};

export type PlacementToDrpcMap = {
  [namespace: string]: {
    [placement: string]: {
      drpcName: string;
      drPolicyName?: string;
      existingLabels: string[];
      updateLabels: string[];
    };
  };
};

export type ACMManagedClusterViewKind = K8sResourceCommon & {
  spec?: {
    scope: {
      apiGroup?: string;
      version?: string;
      name: string;
      namespace?: string;
      kind: string;
    };
  };
  status?: {
    conditions?: K8sResourceCondition[];
    result?: K8sResourceCommon;
  };
};

export type SearchQuery = {
  operationName: string;
  variables: {
    input: {
      filters: { property: string; values: string[] | string }[];
      relatedKinds?: string[];
      limit?: number;
    }[];
  };
  query: string;
};

export type SearchResult = {
  data: {
    searchResult: {
      items?: SearchResultItemType[];
      count?: number;
      related?: {
        items?: SearchResultItemType[];
      }[];
    }[];
  };
};

export type SearchResultItemType = {
  apigroup?: string;
  apiversion: string;
  kind: string;
  name: string;
  namespace?: string;
  cluster: string;
  created: string;
  label: string;
  _uid: string;
};

export enum ManagedClusterActionType {
  UPDATE = 'Update',
  DELETE = 'Delete',
}

export type ACMManagedClusterActionKind = K8sResourceCommon & {
  spec?: {
    cluster?: {
      name: string;
    };
    type?: 'Action';
    actionType?: ManagedClusterActionType;
    scope?: {
      resourceType: string;
      namespace: string;
    };
    kube?: {
      resource?: string;
      name?: string;
      namespace?: string;
      template: K8sResourceCommon;
    };
  };
  status?: {
    conditions?: Array<{
      lastTransitionTime: Date;
      message: string;
      reason: string;
      status: string;
      type: string;
    }>;
    result?: K8sResourceCommon;
  };
};
