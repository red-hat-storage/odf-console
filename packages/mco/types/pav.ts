import {
  K8sResourceCommon,
  K8sResourceCondition,
  ObjectReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { ApplicationType } from '../constants/acm';

export type SubscriptionInfo = {
  subscriptionRefs?: ObjectReference[];
};

export type ApplicationInfo = {
  type: ApplicationType;
  applicationRef?: ObjectReference;
  subscriptionInfo?: SubscriptionInfo;
  destinationNamespace?: string;
};

export type PlacementInfo = {
  placementRef: ObjectReference;
  selectedClusters?: string[];
};

export type DRStatusInfo = {
  phase?: string;
  lastGroupSyncTime?: string;
  conditions?: K8sResourceCondition[];
};

export type DRInfo = {
  drpolicyRef: ObjectReference;
  drClusters?: string[];
  primaryCluster?: string;
  protectedNamespaces?: string[];
  status?: DRStatusInfo;
};

export type ProtectedApplicationViewSpec = {
  drpcRef: ObjectReference;
};

export type ProtectedApplicationViewStatus = {
  applicationInfo?: ApplicationInfo;
  placementInfo?: PlacementInfo;
  drInfo: DRInfo;
  observedGeneration?: number;
  lastSyncTime?: string;
  conditions?: K8sResourceCondition[];
};

export type ProtectedApplicationViewKind = K8sResourceCommon & {
  apiVersion: 'multicluster.odf.openshift.io/v1alpha1';
  kind: 'ProtectedApplicationView';
  spec: ProtectedApplicationViewSpec;
  status?: ProtectedApplicationViewStatus;
};
