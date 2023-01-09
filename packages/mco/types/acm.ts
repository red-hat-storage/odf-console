import { K8sResourceCondition, ApplicationKind } from '@odf/shared/types';
import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export type PlacementDecision = {
  clusterName?: string;
  clusterNamespace?: string;
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

export type ACMMultiClusterObservability = K8sResourceCommon & {
  status?: {
    conditions: K8sResourceCondition[];
  };
};
