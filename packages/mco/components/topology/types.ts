import { DRStatus } from '@odf/mco/utils/dr-status';
import { TopologyQuadrant, NodeStatus } from '@patternfly/react-topology';
import {
  ActiveDROperation,
  ClusterPairOperationsMap,
} from '../../hooks/useActiveDROperations';
import { DRPolicyInfo } from '../../hooks/useDRPoliciesByClusterPair';
import {
  ProtectedAppInfo as HookProtectedAppInfo,
  ClusterAppsMap,
} from '../../hooks/useProtectedAppsByCluster';

export enum TopologyViewLevel {
  CLUSTERS = 'Clusters',
}

export enum DecoratorIcon {
  CheckCircle = 'check-circle',
  ExclamationCircle = 'exclamation-circle',
  ExclamationTriangle = 'exclamation-triangle',
  InProgress = 'in-progress',
  InfoCircle = 'info-circle',
}

export interface TopologyDecorator {
  quadrant: TopologyQuadrant;
  icon: DecoratorIcon;
  tooltip: string;
  status?: NodeStatus;
}

export enum FilterType {
  Namespace = 'namespace',
  Cluster = 'cluster',
  Application = 'application',
  Policy = 'policy',
}

export interface FilterOptions {
  searchValue?: string;
  filterTypes?: FilterType[];
}

export type ProtectedAppInfo = HookProtectedAppInfo;

export type DROperationInfo = ActiveDROperation & {
  isSource?: boolean;
};

export type { ClusterAppsMap, ClusterPairOperationsMap };

export type AppSidebarItem = {
  name: string;
  namespace: string;
  status: DRStatus;
  drPolicy: string;
};

export type StaticAppsSidebarData = {
  isStatic: true;
  apps: AppSidebarItem[];
  clusterName: string;
};

export type OperationAppSidebarData = {
  isSource: boolean;
  operations?: DROperationInfo[];
  operation?: DROperationInfo;
  clusterName: string;
  isGrouped?: boolean;
  appCount?: number;
  action?: string;
  phase?: string;
};

export type OperationEdgeSidebarData = {
  operations: DROperationInfo[];
  pairKey: string;
  isOperation?: boolean;
  operation?: DROperationInfo;
  action?: string;
};

export type PolicyEdgeSidebarData = {
  policies: DRPolicyInfo[];
  pairKey: string;
};

export type SidebarData =
  | StaticAppsSidebarData
  | OperationAppSidebarData
  | OperationEdgeSidebarData
  | PolicyEdgeSidebarData;

export interface ClusterCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface TopologyNodeData {
  decorators?: TopologyDecorator[];
  [key: string]: any;
}

export type AppNodeData = {
  decorators?: TopologyDecorator[];
  clusterName: string;
  appCount: number;

  isStatic?: boolean;
  apps?: ProtectedAppInfo[];
  appStatus?: DRStatus;

  isSource?: boolean;
  operations?: DROperationInfo[];
  operation?: DROperationInfo;
  isGrouped?: boolean;
  action?: string;
  phase?: string;
  progression?: string;
};

export type FailoverNodeData = {
  decorators?: TopologyDecorator[];
  operations: DROperationInfo[];
  action?: string;
};
