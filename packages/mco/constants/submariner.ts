export const SUBMARINER_ADDON_NAME = 'submariner';

export const SUBMARINER_ADDON_KIND =
  'addon.open-cluster-management.io~v1alpha1~ManagedClusterAddOn';

export const SUBMARINER_CONDITION_TYPES = {
  AVAILABLE: 'SubmarinerAgentAvailable', /* also SubMariner* casing */
  CONNECTION_DEGRADED: 'SubmarinerConnectionDegraded',
  ROUTE_AGENT_CONNECTION_DEGRADED: 'RouteAgentConnectionDegraded',
  AGENT_DEGRADED: 'SubmarinerAgentDegraded',
  GATEWAY_NODES_LABELED: 'SubmarinerGatewayNodesLabeled',
};

export enum SubmarinerStatus {
  Checking = 'checking',
  NotInstalled = 'notInstalled',
  Progressing = 'progressing',
  Healthy = 'healthy',
  Degraded = 'degraded',
  Inconsistent = 'inconsistent',
}
