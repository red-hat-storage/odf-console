export const SUBMARINER_ADDON_NAME = 'submariner';
export const SUBMARINER_BROKER_NAME = 'submariner-broker';

export const SUBMARINER_ADDON_KIND =
  'addon.open-cluster-management.io~v1alpha1~ManagedClusterAddOn';
export const SUBMARINER_BROKER_KIND = 'submariner.io~v1alpha1~Broker';
export const SUBMARINER_CLUSTER_KIND = 'submariner.io~v1~Cluster';

export enum SubmarinerConditionType {
  Available = 'Available',
  // Older ACM builds used this condition type name.
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

export enum GlobalnetStatus {
  Skipped = 'skipped',
  Checking = 'checking',
  CidrUnread = 'cidrUnread',
  LoadError = 'loadError',
  OverlapBrokerMissing = 'overlapBrokerMissing',
  OverlapGlobalnetOff = 'overlapGlobalnetOff',
  Enabled = 'enabled',
  EnabledWithOverlap = 'enabledWithOverlap',
  Disabled = 'disabled',
  NotFound = 'notFound',
}
