export const SUBMARINER_ADDON_NAME = 'submariner';

export const SUBMARINER_ADDON_KIND =
  'addon.open-cluster-management.io~v1alpha1~ManagedClusterAddOn';

// ACM ManagedClusterAddOn condition types (wire values).
export enum SubmarinerConditionType {
  Available = 'Available',
  // Older builds used SubmarinerAgentAvailable.
  AvailableLegacy = 'SubmarinerAgentAvailable',
  ConnectionDegraded = 'SubmarinerConnectionDegraded',
  RouteAgentConnectionDegraded = 'RouteAgentConnectionDegraded',
  AgentDegraded = 'SubmarinerAgentDegraded',
  GatewayNodesLabeled = 'SubmarinerGatewayNodesLabeled',
}

export enum SubmarinerStatus {
  Checking = 'checking',
  NotInstalled = 'notInstalled',
  Progressing = 'progressing',
  Unknown = 'unknown',
  Healthy = 'healthy',
  Degraded = 'degraded',
  Inconsistent = 'inconsistent',
  GatewayNodesUnlabeled = 'gatewayNodesUnlabeled',
}
