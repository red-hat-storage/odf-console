import { DRApplication, ReplicationType } from '../constants';
import { ACMManagedClusterKind, Phase } from '../types';

export type PlacementControlInfo = Partial<{
  // Controller name
  drpcName: string;
  // Controller namespace
  drpcNamespace: string;
  // Application workload namespaces on the remote cluster
  workloadNamespaces?: string[];
  // Regional(Async)/Metro(Sync)
  replicationType: ReplicationType;
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
  status: Phase;
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
  appType: DRApplication;
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
  replicationType: ReplicationType;
  pvcName?: string;
  pvcNamespace?: string;
  lastSyncTime?: string;
  schedulingInterval?: string;
};
