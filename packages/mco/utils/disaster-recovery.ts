import {
  getLabel,
  hasLabel,
  getName,
  getNamespace,
} from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types/k8s';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Operator,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { DR_SECHEDULER_NAME } from '../constants';
import { REPLICATION_TYPE } from '../constants/disaster-recovery';
import { DisasterRecoveryResourceKind } from '../hooks';
import { ACMPlacementRuleModel, DRPolicyModel } from '../models';
import {
  ACMSubscriptionKind,
  ACMPlacementRuleKind,
  DRPlacementControlKind,
  ACMPlacementKind,
  DRPolicyKind,
  DRClusterKind,
  ACMManagedClusterKind,
} from '../types';
import { getGVKFromK8Resource, getGVKFromObjectRef } from './common';

export type PlacementRuleMap = {
  [placementRuleName: string]: string;
};

export type SubscriptionMap = {
  [placementRuleName: string]: string[];
};

export type ApplicationDRInfo = {
  drPolicyControl: DRPlacementControlKind;
  subscriptions: string[];
  clusterName: string; // current placement cluster
};

export type DRPolicyMap = {
  [policyName: string]: DRPlacementControlKind[];
};

export const isMinimumSupportedODFVersion = (
  odfVersion: string,
  requiredODFVersion: string
): boolean =>
  odfVersion.localeCompare(requiredODFVersion, undefined, {
    numeric: true,
    sensitivity: 'base',
  }) >= 0;

const isSubscriptionInApplication = (
  subscription: ACMSubscriptionKind,
  expr: MatchExpression,
  match: Boolean
) =>
  match
    ? expr?.values?.includes(getLabel(subscription, expr?.key))
    : !expr?.values?.includes(getLabel(subscription, expr?.key));

const isApplicationInSubscription = (
  subscription: ACMSubscriptionKind,
  expr: MatchExpression,
  match: Boolean
) =>
  match
    ? hasLabel(subscription?.metadata?.labels, expr?.key) &&
      !Array.isArray(expr?.values)
    : !hasLabel(subscription?.metadata?.labels, expr?.key) &&
      !Array.isArray(expr?.values);

export const matchApplicationToSubscription = (
  subscription: ACMSubscriptionKind,
  application: ApplicationKind
): boolean => {
  // applying subscription filter from application
  const valid = application?.spec?.selector?.matchExpressions?.every((expr) => {
    switch (expr?.operator) {
      case Operator.In:
        return isSubscriptionInApplication(subscription, expr, true);
      case Operator.NotIn:
        return isSubscriptionInApplication(subscription, expr, false);
      case Operator.Exists:
        return isApplicationInSubscription(subscription, expr, true);
      case Operator.DoesNotExist:
        return isApplicationInSubscription(subscription, expr, false);
        break;
      default:
        return false;
    }
  });
  return valid;
};

export const isObjectRefMatching = (
  objectRef: ObjectReference,
  objectRefList: string[]
): boolean => objectRefList?.includes(objectRef?.name);

export const filterDRPlacementRuleNames = (
  placementRules: ACMPlacementRuleKind[]
): PlacementRuleMap =>
  placementRules?.reduce(
    (acc, placementRule) =>
      placementRule?.spec?.schedulerName === DR_SECHEDULER_NAME
        ? {
            ...acc,
            [getName(placementRule)]:
              placementRule?.status?.decisions?.[0].clusterName || '',
          }
        : acc,
    {}
  );

export const isPlacementRuleModel = (subscription: ACMSubscriptionKind) =>
  getPlacementKind(subscription) === ACMPlacementRuleModel?.kind;

export const filterDRSubscriptions = (
  application: ApplicationKind,
  subscriptions: ACMSubscriptionKind[],
  placementRuleMap: PlacementRuleMap
): SubscriptionMap =>
  subscriptions?.reduce((acc, subscription) => {
    const placementRuleName = subscription?.spec?.placement?.placementRef?.name;
    const subsMap =
      isPlacementRuleModel(subscription) &&
      isObjectRefMatching(
        subscription?.spec?.placement?.placementRef,
        Object.keys(placementRuleMap) || []
      ) &&
      matchApplicationToSubscription(subscription, application)
        ? {
            ...acc,
            [placementRuleName]: [
              ...(acc[placementRuleName] || []),
              getName(subscription),
            ],
          }
        : acc;
    return subsMap;
  }, {});

export const getAppDRInfo = (
  drPlacementControls: DRPlacementControlKind[],
  subscriptionMap: SubscriptionMap,
  placementRuleMap: PlacementRuleMap
): ApplicationDRInfo[] =>
  drPlacementControls?.reduce(
    (acc, drPlacementControl) =>
      isObjectRefMatching(
        drPlacementControl?.spec?.placementRef,
        Object.keys(subscriptionMap)
      )
        ? [
            ...acc,
            {
              drPolicyControl: drPlacementControl,
              subscriptions:
                subscriptionMap?.[drPlacementControl?.spec?.placementRef?.name],
              clusterName: getPlacementClusterName(
                placementRuleMap,
                drPlacementControl
              ),
            },
          ]
        : acc,
    []
  );

export const getPlacementClusterName = (
  placementRuleMap: PlacementRuleMap,
  drpc: DRPlacementControlKind
) => placementRuleMap?.[drpc?.spec?.placementRef?.name] || '';

export const getDRPolicyName = (drpc: DRPlacementControlKind) =>
  drpc?.spec?.drPolicyRef?.name;

export const getDRPoliciesCount = (drPolicies: DRPolicyMap) =>
  Object.keys(drPolicies || {})?.length;

export const getReplicationType = (schedulingInterval: string) =>
  schedulingInterval !== '0m' ? REPLICATION_TYPE.ASYNC : REPLICATION_TYPE.SYNC;

export const getPlacementKind = (subscription: ACMSubscriptionKind) =>
  subscription?.spec?.placement?.placementRef?.kind;

export const isPeerReadyAndAvailable = (
  drPolicyControl: DRPlacementControlKind
) => {
  let isPeerReady = false;
  let isAvailable = false;
  drPolicyControl?.status?.conditions.forEach((condition) => {
    condition?.type === 'PeerReady' &&
      condition?.status === 'True' &&
      (isPeerReady = true);
    condition?.type === 'Available' &&
      condition?.status === 'True' &&
      (isAvailable = true);
  });
  return isPeerReady && isAvailable;
};

export const findCluster = (
  clusters: K8sResourceCommon[],
  deploymentClusterName: string,
  isDeploymentCluster = false
) =>
  clusters?.find((cluster) =>
    isDeploymentCluster
      ? getName(cluster) === deploymentClusterName
      : getName(cluster) !== deploymentClusterName
  );

export const findDRType = (drClusters: DRClusterKind[]) =>
  drClusters?.every(
    (drCluster) => drCluster?.spec?.region === drClusters?.[0]?.spec?.region
  )
    ? REPLICATION_TYPE.SYNC
    : REPLICATION_TYPE.ASYNC;

export const findDRResourceUsingPlacement = (
  placement: ACMPlacementKind,
  drResources: DisasterRecoveryResourceKind[]
): DisasterRecoveryResourceKind =>
  drResources?.find((drResource) => {
    const placementRef = drResource?.drPlacementControl?.spec?.placementRef;
    return (
      getGVKFromObjectRef(placementRef) === getGVKFromK8Resource(placement) &&
      placementRef?.name === getName(placement) &&
      getNamespace(drResource?.drPlacementControl) === getNamespace(placement)
    );
  });

export const filerManagedClusterUsingDRClusters = (
  drClusters: DRClusterKind[],
  managedClusters: ACMManagedClusterKind[]
) =>
  managedClusters?.filter(
    (managedCluster) =>
      !!drClusters?.find(
        (drCluster) => getName(managedCluster) === getName(drCluster)
      )
  );

export const filerDRClustersUsingDRPolicy = (
  drPolicy: DRPolicyKind,
  drClusters: DRClusterKind[]
) =>
  drClusters?.filter((drCluster) =>
    drPolicy?.spec?.drClusters?.includes(getName(drCluster))
  );

export const findDRPolicyUsingDRPC = (
  drpc: DRPlacementControlKind,
  drPolicies: DRPolicyKind[]
): DRPolicyKind => {
  return drPolicies?.find(
    (drPolicy) =>
      drpc?.spec?.drPolicyRef?.name === getName(drPolicy) &&
      referenceForModel(DRPolicyModel) ===
        getGVKFromObjectRef(drpc?.spec?.drPolicyRef)
  );
};

export const isDRClusterFenced = (cluster: DRClusterKind) =>
  cluster?.status?.phase === 'Fenced';
