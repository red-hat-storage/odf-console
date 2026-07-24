export const SUBMARINER_ADDON_NAME = 'submariner';
export const SUBMARINER_BROKER_NAME = 'submariner-broker';
export const SUBMARINER_BROKER_NAMESPACE = 'submariner-k8s-broker';

export const SUBMARINER_ADDON_KIND =
  'addon.open-cluster-management.io~v1alpha1~ManagedClusterAddOn';
export const SUBMARINER_BROKER_KIND = 'submariner.io~v1alpha1~Broker';
export const SUBMARINER_CLUSTER_KIND = 'submariner.io~v1~Cluster';

export const SUBMARINER_CONDITION_TYPES = {
  AVAILABLE: 'SubmarinerAgentAvailable', /* also SubMariner* casing; match ignore-case */
  CONNECTION_DEGRADED: 'SubmarinerConnectionDegraded',
  ROUTE_AGENT_CONNECTION_DEGRADED: 'RouteAgentConnectionDegraded',
  AGENT_DEGRADED: 'SubmarinerAgentDegraded',
  GATEWAY_NODES_LABELED: 'SubmarinerGatewayNodesLabeled',
};

export const NETWORK_CLUSTER_CLAIM_NAMES = [
  'network.openshift.io',
  'network.cluster.open-cluster-management.io',
] as const;

export enum SubmarinerStatus {
  Checking = 'checking',
  NotInstalled = 'notInstalled',
  Progressing = 'progressing',
  Healthy = 'healthy',
  Degraded = 'degraded',
  Inconsistent = 'inconsistent',
}

// Single Globalnet outcome (overlap first, then broker).
export enum GlobalnetStatus {
  Skipped = 'skipped',
  Checking = 'checking',
  // CIDR overlap could not be determined — block Next.
  CidrUnread = 'cidrUnread',
  // Broker watch failed (non-404) — block Next.
  LoadError = 'loadError',
  // CIDRs overlap and Broker is missing — block Next.
  OverlapBrokerMissing = 'overlapBrokerMissing',
  // CIDRs overlap and Globalnet is off — block Next.
  OverlapGlobalnetOff = 'overlapGlobalnetOff',
  Enabled = 'enabled',
  EnabledWithOverlap = 'enabledWithOverlap',
  Disabled = 'disabled',
  NotFound = 'notFound',
}
