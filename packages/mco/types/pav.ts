import {
  K8sResourceCommon,
  K8sResourceCondition,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';

export enum ApplicationType {
  ApplicationSet = 'ApplicationSet',
  Subscription = 'Subscription',
  Discovered = 'Discovered',
}

export interface SubscriptionInfo {
  subscriptionRefs?: ObjectReference[];
}

export interface ApplicationInfo {
  type: ApplicationType;
  applicationRef?: ObjectReference;
  subscriptionInfo?: SubscriptionInfo;
}

export interface PlacementInfo {
  placementRef: ObjectReference;
  selectedClusters?: string[];
}

export interface DRStatusInfo {
  phase?: string;
  lastGroupSyncTime?: string;
  conditions?: K8sResourceCondition[];
}

export interface DRInfo {
  drpolicyRef: ObjectReference;
  drClusters?: string[];
  primaryCluster?: string;
  protectedNamespaces?: string[];
  status?: DRStatusInfo;
}

export interface ProtectedApplicationViewSpec {
  drpcRef: ObjectReference;
}

export interface ProtectedApplicationViewStatus {
  applicationInfo?: ApplicationInfo;
  placementInfo?: PlacementInfo;
  drInfo: DRInfo;
  observedGeneration?: number;
  lastSyncTime?: string;
  conditions?: K8sResourceCondition[];
}

export type ProtectedApplicationViewKind = K8sResourceCommon & {
  apiVersion: 'multicluster.odf.openshift.io/v1alpha1';
  kind: 'ProtectedApplicationView';
  spec: ProtectedApplicationViewSpec;
  status?: ProtectedApplicationViewStatus;
};
