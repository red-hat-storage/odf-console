export const SUBMARINER_ADDON_NAME = 'submariner';
export const SUBMARINER_BROKER_NAME = 'submariner-broker';
export const SUBMARINER_OPERATOR_NAMESPACE = 'submariner-operator';

export const SUBMARINER_ADDON_KIND =
  'addon.open-cluster-management.io~v1alpha1~ManagedClusterAddOn';
export const SUBMARINER_BROKER_KIND = 'submariner.io~v1alpha1~Broker';
export const SUBMARINER_CLUSTER_KIND = 'submariner.io~v1~Cluster';

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

/** Intermediate broker Globalnet flag used before mapping to GlobalnetStatus. */
export enum BrokerGlobalnetFlag {
  Enabled = 'enabled',
  Disabled = 'disabled',
  Missing = 'missing',
}

export const NETWORK_CLUSTER_CLAIM_NAMES = [
  'network.openshift.io',
  'network.cluster.open-cluster-management.io',
] as const;

export type NetworkClusterClaimName =
  (typeof NETWORK_CLUSTER_CLAIM_NAMES)[number];

export const isNetworkClusterClaimName = (
  name: string
): name is NetworkClusterClaimName =>
  NETWORK_CLUSTER_CLAIM_NAMES.some((knownName) => knownName === name);

export enum SubmarinerStatus {
  Checking = 'checking',
  NotInstalled = 'notInstalled',
  UpstreamDetected = 'upstreamDetected',
  Progressing = 'progressing',
  Unknown = 'unknown',
  Healthy = 'healthy',
  Degraded = 'degraded',
  Inconsistent = 'inconsistent',
  GatewayNodesUnlabeled = 'gatewayNodesUnlabeled',
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
