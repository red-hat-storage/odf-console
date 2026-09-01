import {
  SUBMARINER_BROKER_NAME,
  GlobalnetStatus,
  SubmarinerConditionType,
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
import {
  K8sResourceCondition,
  K8sResourceConditionStatus,
} from '@odf/shared/types';
import {
  CidrOverlapResult,
  asStringArray,
  evaluateCidrListsOverlap,
  isNotFoundError,
} from '@odf/shared/utils';

enum BrokerGlobalnetFlag {
  Enabled = 'enabled',
  Disabled = 'disabled',
  Missing = 'missing',
}

const NETWORK_CLUSTER_CLAIM_NAMES = [
  'network.openshift.io',
  'network.cluster.open-cluster-management.io',
] as const;

const isNetworkClusterClaimName = (name: string): boolean =>
  NETWORK_CLUSTER_CLAIM_NAMES.some((knownName) => knownName === name);

export type SubmarinerPrePairResult = {
  canProceed: boolean;
  status: SubmarinerStatus;
};

const findSubmarinerCondition = (
  conditions: K8sResourceCondition[],
  type: string
) => findCondition(conditions, type, { ignoreCase: true });

type ParsedSubmarinerConditions = {
  available: K8sResourceCondition | undefined;
  connectionDegraded: K8sResourceCondition | undefined;
  routeAgentConnectionDegraded: K8sResourceCondition | undefined;
  agentDegraded: K8sResourceCondition | undefined;
  gatewayNodesLabeled: K8sResourceCondition | undefined;
};

const getSubmarinerConditions = (
  conditions: K8sResourceCondition[]
): ParsedSubmarinerConditions => ({
  available:
    findSubmarinerCondition(conditions, SubmarinerConditionType.Available) ||
    findSubmarinerCondition(
      conditions,
      SubmarinerConditionType.AvailableLegacy
    ),
  connectionDegraded: findSubmarinerCondition(
    conditions,
    SubmarinerConditionType.ConnectionDegraded
  ),
  routeAgentConnectionDegraded: findSubmarinerCondition(
    conditions,
    SubmarinerConditionType.RouteAgentConnectionDegraded
  ),
  agentDegraded: findSubmarinerCondition(
    conditions,
    SubmarinerConditionType.AgentDegraded
  ),
  gatewayNodesLabeled: findSubmarinerCondition(
    conditions,
    SubmarinerConditionType.GatewayNodesLabeled
  ),
});

const isSubmarinerDegraded = ({
  connectionDegraded,
  routeAgentConnectionDegraded,
  agentDegraded,
}: ParsedSubmarinerConditions): boolean =>
  isConditionStatus(connectionDegraded, K8sResourceConditionStatus.True) ||
  isConditionStatus(
    routeAgentConnectionDegraded,
    K8sResourceConditionStatus.True
  ) ||
  isConditionStatus(agentDegraded, K8sResourceConditionStatus.True);

const areGatewayNodesUnlabeled = ({
  gatewayNodesLabeled,
}: ParsedSubmarinerConditions): boolean =>
  !!gatewayNodesLabeled &&
  !isConditionStatus(gatewayNodesLabeled, K8sResourceConditionStatus.True);

const isSubmarinerHealthy = ({
  available,
  connectionDegraded,
}: ParsedSubmarinerConditions): boolean =>
  isConditionStatus(available, K8sResourceConditionStatus.True) &&
  isConditionStatus(connectionDegraded, K8sResourceConditionStatus.False);

const getClusterSubmarinerStatus = (
  addon: SubmarinerAddOnKind | undefined,
  loadError: unknown
): SubmarinerStatus => {
  if (loadError && isNotFoundError(loadError)) {
    return SubmarinerStatus.NotInstalled;
  }

  if (loadError) {
    return SubmarinerStatus.Degraded;
  }

  if (!addon) {
    return SubmarinerStatus.NotInstalled;
  }

  const conditions = addon.status?.conditions ?? [];
  const submarinerConditions = getSubmarinerConditions(conditions);

  if (isSubmarinerDegraded(submarinerConditions)) {
    return SubmarinerStatus.Degraded;
  }

  if (areGatewayNodesUnlabeled(submarinerConditions)) {
    return SubmarinerStatus.GatewayNodesUnlabeled;
  }

  if (isSubmarinerHealthy(submarinerConditions)) {
    return SubmarinerStatus.Healthy;
  }

  if (
    isConditionStatus(
      submarinerConditions.available,
      K8sResourceConditionStatus.False
    )
  ) {
    return SubmarinerStatus.Progressing;
  }

  return SubmarinerStatus.Unknown;
};

export const evaluateSubmarinerPrePair = (
  clusters: Array<{
    addon: SubmarinerAddOnKind | undefined;
    loaded: boolean;
    loadError: unknown;
  }>
): SubmarinerPrePairResult => {
  if (!clusters.length || !clusters.every(({ loaded }) => loaded)) {
    return { canProceed: false, status: SubmarinerStatus.Checking };
  }

  const statuses = clusters.map(({ addon, loadError }) =>
    getClusterSubmarinerStatus(addon, loadError)
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

  if (
    statuses.some((status) => status === SubmarinerStatus.GatewayNodesUnlabeled)
  ) {
    return {
      canProceed: false,
      status: SubmarinerStatus.GatewayNodesUnlabeled,
    };
  }

  if (statuses.some((status) => status === SubmarinerStatus.Progressing)) {
    return { canProceed: false, status: SubmarinerStatus.Progressing };
  }

  if (statuses.some((status) => status === SubmarinerStatus.Unknown)) {
    return { canProceed: true, status: SubmarinerStatus.Unknown };
  }

  if (statuses.every((status) => status === SubmarinerStatus.Healthy)) {
    return { canProceed: true, status: SubmarinerStatus.Healthy };
  }

  return { canProceed: true, status: SubmarinerStatus.Unknown };
};

const extractCidrsFromNetworkClaimValue = (
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
    isNetworkClusterClaimName(claim.name)
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
): BrokerGlobalnetFlag => {
  if (!brokers?.length) {
    return BrokerGlobalnetFlag.Missing;
  }
  const broker = brokers.find(
    (item) => getName(item) === SUBMARINER_BROKER_NAME
  );
  if (!broker) {
    return BrokerGlobalnetFlag.Missing;
  }
  return broker.spec?.globalnetEnabled
    ? BrokerGlobalnetFlag.Enabled
    : BrokerGlobalnetFlag.Disabled;
};

// Order: skip/loading → broker watch failure → CIDR unreadability →
// overlap + Globalnet off/missing (block) → otherwise broker status (allow).
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

  if (networkCidrs.length !== 2 || networkCidrs.some((cidrs) => !cidrs)) {
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

  if (
    clusterOverlap === CidrOverlapResult.Unknown ||
    serviceOverlap === CidrOverlapResult.Unknown
  ) {
    return GlobalnetStatus.CidrUnread;
  }

  const hasOverlap =
    clusterOverlap === CidrOverlapResult.Overlap ||
    serviceOverlap === CidrOverlapResult.Overlap;
  const broker = getBrokerGlobalnetFlag(
    isNotFoundError(brokersError) ? undefined : brokers
  );

  if (hasOverlap) {
    if (broker === BrokerGlobalnetFlag.Enabled) {
      return GlobalnetStatus.EnabledWithOverlap;
    }
    if (broker === BrokerGlobalnetFlag.Missing) {
      return GlobalnetStatus.OverlapBrokerMissing;
    }
    return GlobalnetStatus.OverlapGlobalnetOff;
  }

  if (broker === BrokerGlobalnetFlag.Enabled) {
    return GlobalnetStatus.Enabled;
  }
  if (broker === BrokerGlobalnetFlag.Missing) {
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
