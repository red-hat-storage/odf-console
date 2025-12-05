import { DASH, getName } from '@odf/shared';
import { ObjectReference } from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationType } from '../constants';
import { ProtectedApplicationViewKind } from '../types/pav';

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
