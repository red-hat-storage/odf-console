import { DASH, getName } from '@odf/shared';
import {
  ObjectReference,
  type K8sResourceCondition,
} from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationType } from '../constants';
import { ProtectedApplicationViewKind } from '../types/pav';

export type DRPCClusterInfo = {
  primaryCluster: string;
  targetCluster: string;
  isPeerReady: boolean;
  isAvailable: boolean;
};

const hasCondition = (
  conditions: K8sResourceCondition[],
  type: string
): boolean =>
  !!conditions?.some((c) => c?.type === type && c?.status === 'True');

export const buildClusterInfo = (
  pav: ProtectedApplicationViewKind
): DRPCClusterInfo => {
  const primaryCluster = pav.status?.drInfo?.primaryCluster || '';
  const drClusters = pav.status?.drInfo?.drClusters || [];
  const targetCluster = drClusters.find((c) => c && c !== primaryCluster) || '';
  const conditions = pav.status?.drInfo?.status?.conditions || [];
  return {
    primaryCluster,
    targetCluster,
    isPeerReady: hasCondition(conditions, 'PeerReady'),
    isAvailable: hasCondition(conditions, 'Available'),
  };
};

export const getApplicationName = (
  pav: ProtectedApplicationViewKind
): string => {
  return pav.status?.applicationInfo?.applicationRef?.name || getName(pav);
};

export const getApplicationType = (
  pav: ProtectedApplicationViewKind
): ApplicationType => {
  return pav.status?.applicationInfo?.type || ApplicationType.Discovered;
};

export const getProtectedNamespaces = (
  pav: ProtectedApplicationViewKind
): string[] => {
  return pav.status?.drInfo?.protectedNamespaces || [];
};

export const getPrimaryCluster = (
  pav: ProtectedApplicationViewKind
): string => {
  return pav.status?.drInfo?.primaryCluster || DASH;
};

export const getSubscriptionCount = (
  pav: ProtectedApplicationViewKind
): number => {
  return (
    pav.status?.applicationInfo?.subscriptionInfo?.subscriptionRefs?.length || 0
  );
};

export const getDRPlacementControlRef = (
  pav: ProtectedApplicationViewKind
): ObjectReference => {
  return pav.spec.drpcRef;
};

export const getPAVDRPolicyName = (
  pav: ProtectedApplicationViewKind
): string => {
  return pav.status?.drInfo?.drpolicyRef?.name;
};
