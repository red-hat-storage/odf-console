import { APPLICATION_TYPE, DRPC_STATUS, REPLICATION_TYPE } from '../constants';
import { ACMManagedClusterKind } from '../types';

export type PlacementControlInfo = Partial<{
  // Controller name
  drpcName: string;
  // Controller namespace
  drpcNamespace: string;
  // Application workload namespaces on the remote cluster
  workloadNamespaces?: string[];
  // Regional(Async)/Metro(Sync)
  replicationType: REPLICATION_TYPE;
  // Persisting volume sync interval
  volumeSyncInterval: string;
  // Application deployment remote cluster name.
  deploymentClusterName: string;
  // Failing over cluster name
  failoverCluster: string;
  // Surviving/relocate cluster name
  preferredCluster: string;
  // Volume group last sync time
  lastVolumeGroupSyncTime: string;
  // DR status
  status: DRPC_STATUS;
  // DR protected PVC count for the application
  protectedPVCs: string[];
  // Only applicable for Subscription type
  // Subscription name(Only for display purpose)
  subscriptions?: string[];
  // Only applicable for Discovered type
  // Recent successful kube object protection Time
  kubeObjectLastProtectionTime?: string;
  // Kube resources backup interval(interval + unit(m, h, d))
  kubeObjSyncInterval?: string;
}>;

export type ProtectedAppsMap = {
  // Managed/Discovered application name
  appName: string;
  // Managed/Discovered application namespace
  appNamespace: string;
  // Managed(Subscription/ApplicationSet)/Discovered(DRPlacementControl)
  appKind: string;
  appAPIVersion: string;
  // Subscription/ApplicationSet/Discovred
  appType: APPLICATION_TYPE;
  // ToDo: refactor this PlacementInfo type to
  // Make more flxibile between different app types
  placementControlInfo: PlacementControlInfo[];
};

export type ApplicationObj = {
  namespace: string;
  name: string;
};

export type DRClusterAppsMap = {
  [drClusterName: string]: {
    // Managed cluster info
    managedCluster: ACMManagedClusterKind;
    // Total count of Subscription + ApplicationSet apps
    totalManagedAppsCount?: number;
    // Total count of Discovered apps
    totalDiscoveredAppsCount?: number;
    // Protected Managed and Discovred apps from the managed cluster
    protectedApps: ProtectedAppsMap[];
  };
};

// Protected PVC info from VRG
export type ProtectedPVCData = {
  drpcName: string;
  drpcNamespace: string;
  replicationType: REPLICATION_TYPE;
  pvcName?: string;
  pvcNamespace?: string;
  lastSyncTime?: string;
  schedulingInterval?: string;
};
