import {
  ArgoApplicationSetKind,
  ACMManagedClusterKind,
  DRPlacementControlKind,
} from '../types';

export type ProtectedAppSetsMap = {
  application: ArgoApplicationSetKind;
  syncInterval: string;
  // make this a list if app have multiple DRPCs
  drPlacementControl: DRPlacementControlKind;
};

export type AppSetObj = {
  namespace: string;
  name: string;
};

export type DrClusterAppsMap = {
  [drClusterName: string]: {
    managedCluster: ACMManagedClusterKind;
    totalAppSetsCount: number;
    protectedAppSets: ProtectedAppSetsMap[];
  };
};
