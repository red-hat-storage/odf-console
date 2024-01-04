import { APPLICATION_TYPE, DRPC_STATUS, REPLICATION_TYPE } from '../constants';
import { ACMManagedClusterKind } from '../types';

export type PlacementInfo = Partial<{
  drpcName: string;
  drpcNamespace: string;
  workloadNamespace: string;
  replicationType: REPLICATION_TYPE;
  syncInterval: string;
  deploymentClusterName: string;
  failoverCluster: string;
  preferredCluster: string;
  lastGroupSyncTime: string;
  status: DRPC_STATUS;
  protectedPVCs: string[];
  // Only applicable for Subscription type
  subscriptions?: string[];
}>;

export type ProtectedAppsMap = {
  appName: string;
  appNamespace: string;
  appKind: string;
  appAPIVersion: string;
  appType: APPLICATION_TYPE;
  // ToDo: refactor this PlacementInfo type to
  // make more flxibile between different app types
  placementInfo: PlacementInfo[];
};

export type ApplicationObj = {
  namespace: string;
  name: string;
};

export type DRClusterAppsMap = {
  [drClusterName: string]: {
    managedCluster: ACMManagedClusterKind;
    totalAppCount: number;
    protectedApps: ProtectedAppsMap[];
  };
};

export type ProtectedPVCData = {
  drpcName: string;
  drpcNamespace: string;
  replicationType: REPLICATION_TYPE;
  pvcName?: string;
  pvcNamespace?: string;
  lastSyncTime?: string;
  schedulingInterval?: string;
};
