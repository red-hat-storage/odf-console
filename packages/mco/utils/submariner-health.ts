import {
  NETWORK_CLUSTER_CLAIM_NAMES,
  SUBMARINER_BROKER_NAME,
  SUBMARINER_CONDITION_TYPES,
  GlobalnetStatus,
  SubmarinerStatus,
} from '@odf/mco/constants';
import {
  ClusterClaim,
  ClusterNetworkCidrs,
  ManagedClusterNetworkInfo,
  SubmarinerAddOnKind,
  SubmarinerBrokerKind,
  SubmarinerClusterKind,
} from '@odf/mco/types';
import {
  findCondition,
  getName,
  isConditionStatus,
} from '@odf/shared/selectors';
import { K8sResourceConditionStatus } from '@odf/shared/types';
import {
  evaluateCidrListsOverlap,
  isNotFoundError,
} from '@odf/shared/utils';

const getClusterSubmarinerStatus = (
  addon: SubmarinerAddOnKind | undefined,
  loaded: boolean,
  loadError: unknown
): SubmarinerStatus => {
  if (!loaded) {
    return SubmarinerStatus.Checking;
  }

  // 404 = addon/API absent on the hub (not installed), not a failed install.
  if (loadError && isNotFoundError(loadError)) {
    return SubmarinerStatus.NotInstalled;
  }

  // Non-404 watch/API failure — treat as unhealthy so Next stays blocked.
  if (loadError) {
    return SubmarinerStatus.Degraded;
  }

  if (!addon) {
    return SubmarinerStatus.NotInstalled;
  }

  const conditions = addon.status?.conditions ?? [];
  const available = findCondition(conditions, SUBMARINER_CONDITION_TYPES.AVAILABLE, {
    ignoreCase: true,
  });
  const connectionDegraded = findCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.CONNECTION_DEGRADED,
    { ignoreCase: true }
  );
  const routeAgentConnectionDegraded = findCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.ROUTE_AGENT_CONNECTION_DEGRADED,
    { ignoreCase: true }
  );
  const agentDegraded = findCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.AGENT_DEGRADED,
    { ignoreCase: true }
  );
  const gatewayNodesLabeled = findCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.GATEWAY_NODES_LABELED,
    { ignoreCase: true }
  );

  if (!isConditionStatus(available, K8sResourceConditionStatus.True)) {
    return SubmarinerStatus.Progressing;
  }

  if (
    isConditionStatus(connectionDegraded, K8sResourceConditionStatus.True) ||
    isConditionStatus(
      routeAgentConnectionDegraded,
      K8sResourceConditionStatus.True
    ) ||
    isConditionStatus(agentDegraded, K8sResourceConditionStatus.True) ||
    (gatewayNodesLabeled &&
      !isConditionStatus(gatewayNodesLabeled, K8sResourceConditionStatus.True))
  ) {
    return SubmarinerStatus.Degraded;
  }

  // Healthy only when ConnectionDegraded is explicitly False; missing → Progressing.
  if (isConditionStatus(connectionDegraded, K8sResourceConditionStatus.False)) {
    return SubmarinerStatus.Healthy;
  }

  return SubmarinerStatus.Progressing;
};

export const evaluateSubmarinerPrePair = (
  clusters: Array<{
    addon: SubmarinerAddOnKind | undefined;
    loaded: boolean;
    loadError: unknown;
  }>
): { canProceed: boolean; status: SubmarinerStatus } => {
  if (!clusters.every(({ loaded }) => loaded)) {
    return { canProceed: false, status: SubmarinerStatus.Checking };
  }

  const statuses = clusters.map(({ addon, loaded, loadError }) =>
    getClusterSubmarinerStatus(addon, loaded, loadError)
  );

  const allNotInstalled = statuses.every(
    (status) => status === SubmarinerStatus.NotInstalled
  );
  if (allNotInstalled) {
    return { canProceed: true, status: SubmarinerStatus.NotInstalled };
  }

  const someNotInstalled = statuses.some(
    (status) => status === SubmarinerStatus.NotInstalled
  );
  if (someNotInstalled) {
    return { canProceed: false, status: SubmarinerStatus.Inconsistent };
  }

  if (statuses.some((status) => status === SubmarinerStatus.Degraded)) {
    return { canProceed: false, status: SubmarinerStatus.Degraded };
  }

  if (statuses.some((status) => status === SubmarinerStatus.Progressing)) {
    return { canProceed: false, status: SubmarinerStatus.Progressing };
  }

  if (statuses.every((status) => status === SubmarinerStatus.Healthy)) {
    return { canProceed: true, status: SubmarinerStatus.Healthy };
  }

  return { canProceed: false, status: SubmarinerStatus.Progressing };
};

const asStringArray = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item === 'string') {
      return [item];
    }
    if (
      item &&
      typeof item === 'object' &&
      'cidr' in item &&
      typeof (item as { cidr: unknown }).cidr === 'string'
    ) {
      return [(item as { cidr: string }).cidr];
    }
    return [];
  });
};

export const extractCidrsFromNetworkClaimValue = (
  value?: string
): ClusterNetworkCidrs | null => {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as {
      clusterNetwork?: unknown;
      serviceNetwork?: unknown;
    };
    const clusterCidrs = asStringArray(parsed.clusterNetwork);
    const serviceCidrs = asStringArray(parsed.serviceNetwork);

    if (!clusterCidrs.length && !serviceCidrs.length) {
      return null;
    }

    return { clusterCidrs, serviceCidrs };
  } catch {
    return null;
  }
};

const getClusterNetworkCidrsFromClaims = (
  clusterClaims?: ClusterClaim[]
): ClusterNetworkCidrs | null => {
  const networkClaim = clusterClaims?.find((claim) =>
    NETWORK_CLUSTER_CLAIM_NAMES.includes(
      claim.name as (typeof NETWORK_CLUSTER_CLAIM_NAMES)[number]
    )
  );
  return extractCidrsFromNetworkClaimValue(networkClaim?.value);
};

const getClusterNetworkCidrsFromSubmarinerCluster = (
  clusterName: string,
  submarinerClusters?: SubmarinerClusterKind[]
): ClusterNetworkCidrs | null => {
  const match = submarinerClusters?.find((cluster) => {
    const name = getName(cluster);
    const clusterId = cluster.spec?.cluster_id;
    return name === clusterName || clusterId === clusterName;
  });

  if (!match) {
    return null;
  }

  const clusterCidrs = match.spec?.cluster_cidr ?? [];
  const serviceCidrs = match.spec?.service_cidr ?? [];
  if (!clusterCidrs.length && !serviceCidrs.length) {
    return null;
  }

  return { clusterCidrs, serviceCidrs };
};

const resolveClusterNetworkCidrs = (
  clusterName: string,
  clusterClaims?: ClusterClaim[],
  submarinerClusters?: SubmarinerClusterKind[]
): ClusterNetworkCidrs | null =>
  getClusterNetworkCidrsFromClaims(clusterClaims) ??
  getClusterNetworkCidrsFromSubmarinerCluster(clusterName, submarinerClusters);

const getBrokerGlobalnetFlag = (
  brokers: SubmarinerBrokerKind[] | undefined
): 'enabled' | 'disabled' | 'missing' => {
  if (!brokers?.length) {
    return 'missing';
  }
  const broker =
    brokers.find((item) => getName(item) === SUBMARINER_BROKER_NAME) ??
    brokers[0];
  return broker?.spec?.globalnetEnabled ? 'enabled' : 'disabled';
};

// Overlap first, then broker:
// 1. CIDRs missing/unreadable → CidrUnread (block)
// 2. Overlap + Globalnet off/missing → block
// 3. Broker watch failure → LoadError (block)
// 4. Otherwise show broker status (allow)
export const evaluateGlobalnetPrePair = (
  brokers: SubmarinerBrokerKind[] | undefined,
  brokersLoaded: boolean,
  brokersError: unknown,
  clusters: ManagedClusterNetworkInfo[],
  submarinerClusters: SubmarinerClusterKind[] | undefined,
  submarinerClustersLoaded: boolean,
  skipGlobalnetCheck: boolean
): GlobalnetStatus => {
  if (skipGlobalnetCheck) {
    return GlobalnetStatus.Skipped;
  }

  if (
    !brokersLoaded ||
    !clusters.every((cluster) => cluster.loaded) ||
    !submarinerClustersLoaded
  ) {
    return GlobalnetStatus.Checking;
  }

  if (brokersError && !isNotFoundError(brokersError)) {
    return GlobalnetStatus.LoadError;
  }

  const networkCidrs = clusters.map((cluster) =>
    resolveClusterNetworkCidrs(
      cluster.clusterName,
      cluster.clusterClaims,
      submarinerClusters
    )
  );

  if (networkCidrs.some((cidrs) => !cidrs)) {
    return GlobalnetStatus.CidrUnread;
  }

  const [left, right] = networkCidrs as ClusterNetworkCidrs[];
  const clusterOverlap = evaluateCidrListsOverlap(
    left.clusterCidrs,
    right.clusterCidrs
  );
  const serviceOverlap = evaluateCidrListsOverlap(
    left.serviceCidrs,
    right.serviceCidrs
  );

  if (clusterOverlap === 'unknown' || serviceOverlap === 'unknown') {
    return GlobalnetStatus.CidrUnread;
  }

  const hasOverlap =
    clusterOverlap === 'overlap' || serviceOverlap === 'overlap';
  const broker = getBrokerGlobalnetFlag(
    isNotFoundError(brokersError) ? undefined : brokers
  );

  if (hasOverlap) {
    if (broker === 'enabled') {
      return GlobalnetStatus.EnabledWithOverlap;
    }
    if (broker === 'missing') {
      return GlobalnetStatus.OverlapBrokerMissing;
    }
    return GlobalnetStatus.OverlapGlobalnetOff;
  }

  if (broker === 'enabled') {
    return GlobalnetStatus.Enabled;
  }
  if (broker === 'missing') {
    return GlobalnetStatus.NotFound;
  }
  return GlobalnetStatus.Disabled;
};

export const doesGlobalnetBlockProceed = (status: GlobalnetStatus): boolean =>
  status === GlobalnetStatus.Checking ||
  status === GlobalnetStatus.CidrUnread ||
  status === GlobalnetStatus.LoadError ||
  status === GlobalnetStatus.OverlapBrokerMissing ||
  status === GlobalnetStatus.OverlapGlobalnetOff;
