import { K8sResourceCondition, ApplicationKind } from '@odf/shared/types';
import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { ArgoApplicationSetKind } from './argo-cd';

export type ACMManagedClusterKind = K8sResourceCommon & {
  status?: {
    clusterClaims?: {
      name: string;
      value: string;
    }[];
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
      clusterName?: string;
    }[];
    clusterSelector?: Selector | null;
  };
  status?: {
    conditions: K8sResourceCondition[];
    numberOfSelectedClusters?: number;
  };
};

export type ACMPlacementDecisionKind = K8sResourceCommon & {
  status: {
    decisions: {
      // ClusterDecision represents a decision from a placement
      clusterName: string;
      reason: string;
    }[];
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
      existingLabels: string[];
      updateLabels: string[];
    };
  };
};
