import {
  NETWORK_CLUSTER_CLAIM_NAMES,
  SUBMARINER_BROKER_NAME,
  SUBMARINER_CONDITION_TYPES,
  GlobalnetCheckStatus,
  GlobalnetRequirement,
  SubmarinerClusterHealth,
} from '@odf/mco/constants';
import {
  ClusterClaim,
  ClusterNetworkCidrs,
  ClusterSubmarinerStatus,
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
import { K8sResourceCondition } from '@odf/shared/types';
import { doCidrListsOverlap, isNotFoundError } from '@odf/shared/utils';

const findSubmarinerCondition = (
  conditions: K8sResourceCondition[] | undefined,
  type: string
): K8sResourceCondition | undefined =>
  findCondition(conditions, type, { ignoreCase: true });

export const getSubmarinerClusterHealth = (
  addon: SubmarinerAddOnKind | undefined,
  loaded: boolean,
  loadError: unknown
): SubmarinerClusterHealth => {
  if (!loaded) {
    return SubmarinerClusterHealth.Checking;
  }

  if (loadError && isNotFoundError(loadError)) {
    return SubmarinerClusterHealth.NotInstalled;
  }

  if (loadError) {
    return SubmarinerClusterHealth.Degraded;
  }

  if (!addon) {
    return SubmarinerClusterHealth.NotInstalled;
  }

  const conditions = addon.status?.conditions ?? [];
  const available = findSubmarinerCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.AVAILABLE
  );
  const connectionDegraded = findSubmarinerCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.CONNECTION_DEGRADED
  );
  const routeAgentConnectionDegraded = findSubmarinerCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.ROUTE_AGENT_CONNECTION_DEGRADED
  );
  const agentDegraded = findSubmarinerCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.AGENT_DEGRADED
  );
  const gatewayNodesLabeled = findSubmarinerCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.GATEWAY_NODES_LABELED
  );

  if (!available) {
    return SubmarinerClusterHealth.Progressing;
  }

  if (
    isConditionStatus(connectionDegraded, 'True') ||
    isConditionStatus(routeAgentConnectionDegraded, 'True') ||
    isConditionStatus(agentDegraded, 'True') ||
    !isConditionStatus(available, 'True') ||
    (gatewayNodesLabeled && !isConditionStatus(gatewayNodesLabeled, 'True'))
  ) {
    return SubmarinerClusterHealth.Degraded;
  }

  if (!agentDegraded || !connectionDegraded) {
    return SubmarinerClusterHealth.Progressing;
  }

  if (
    isConditionStatus(available, 'True') &&
    isConditionStatus(agentDegraded, 'False') &&
    isConditionStatus(connectionDegraded, 'False')
  ) {
    return SubmarinerClusterHealth.Healthy;
  }

  return SubmarinerClusterHealth.Progressing;
};

export const getSubmarinerFailureMessage = (
  addon: SubmarinerAddOnKind | undefined
): string | undefined => {
  const conditions = addon?.status?.conditions ?? [];
  const degradedCondition = conditions.find(
    (condition) =>
      /degraded/i.test(condition.type ?? '') &&
      isConditionStatus(condition, 'True')
  );
  return degradedCondition?.message;
};

const isSubmarinerDetected = (health: SubmarinerClusterHealth): boolean =>
  health !== SubmarinerClusterHealth.NotInstalled;

const isAcmManagedSubmariner = (health: SubmarinerClusterHealth): boolean =>
  isSubmarinerDetected(health) &&
  health !== SubmarinerClusterHealth.UpstreamDetected;

export const isMixedSubmarinerInstall = (
  clusterStatuses: ClusterSubmarinerStatus[]
): boolean => {
  const hasSubmariner = clusterStatuses.some(({ health }) =>
    isSubmarinerDetected(health)
  );
  const allHaveSubmariner = clusterStatuses.every(({ health }) =>
    isSubmarinerDetected(health)
  );
  return hasSubmariner && !allHaveSubmariner;
};

export const isMixedSubmarinerInstallMethod = (
  clusterStatuses: ClusterSubmarinerStatus[]
): boolean =>
  clusterStatuses.some(
    ({ health }) => health === SubmarinerClusterHealth.UpstreamDetected
  ) && clusterStatuses.some(({ health }) => isAcmManagedSubmariner(health));

export const evaluateSubmarinerPrePair = (
  clusters: Array<{
    clusterName: string;
    addon: SubmarinerAddOnKind | undefined;
    loaded: boolean;
    loadError: unknown;
    upstreamDetected?: boolean;
  }>
): {
  overallHealth: SubmarinerClusterHealth;
  clusterStatuses: ClusterSubmarinerStatus[];
  canProceed: boolean;
} => {
  const clusterStatuses: ClusterSubmarinerStatus[] = clusters.map(
    ({ clusterName, addon, loaded, loadError, upstreamDetected }) => {
      let health = getSubmarinerClusterHealth(addon, loaded, loadError);
      if (health === SubmarinerClusterHealth.NotInstalled && upstreamDetected) {
        health = SubmarinerClusterHealth.UpstreamDetected;
      }
      const message =
        health === SubmarinerClusterHealth.Degraded
          ? getSubmarinerFailureMessage(addon)
          : undefined;
      return { clusterName, health, message };
    }
  );

  const allLoaded = clusters.every(({ loaded }) => loaded);
  const allNotInstalled = clusterStatuses.every(
    ({ health }) => health === SubmarinerClusterHealth.NotInstalled
  );
  const allUpstreamDetected = clusterStatuses.every(
    ({ health }) => health === SubmarinerClusterHealth.UpstreamDetected
  );
  const anyUpstreamDetected = clusterStatuses.some(
    ({ health }) => health === SubmarinerClusterHealth.UpstreamDetected
  );
  const anyDegraded = clusterStatuses.some(
    ({ health }) => health === SubmarinerClusterHealth.Degraded
  );
  const anyProgressing = clusterStatuses.some(
    ({ health }) =>
      health === SubmarinerClusterHealth.Progressing ||
      health === SubmarinerClusterHealth.Checking
  );
  const bothHaveSubmariner = clusterStatuses.every(({ health }) =>
    isSubmarinerDetected(health)
  );
  const allAcmHealthy = clusterStatuses.every(
    ({ health }) => health === SubmarinerClusterHealth.Healthy
  );

  let overallHealth = SubmarinerClusterHealth.Checking;
  if (!allLoaded) {
    overallHealth = SubmarinerClusterHealth.Checking;
  } else if (allNotInstalled) {
    overallHealth = SubmarinerClusterHealth.NotInstalled;
  } else if (isMixedSubmarinerInstall(clusterStatuses)) {
    overallHealth = SubmarinerClusterHealth.Degraded;
  } else if (allUpstreamDetected || anyUpstreamDetected) {
    overallHealth = SubmarinerClusterHealth.UpstreamDetected;
  } else if (anyDegraded) {
    overallHealth = SubmarinerClusterHealth.Degraded;
  } else if (anyProgressing) {
    overallHealth = SubmarinerClusterHealth.Progressing;
  } else if (allAcmHealthy) {
    overallHealth = SubmarinerClusterHealth.Healthy;
  }

  const canProceed =
    allLoaded &&
    (allNotInstalled ||
      (bothHaveSubmariner && !anyDegraded && !anyProgressing));

  return { overallHealth, clusterStatuses, canProceed };
};

export const evaluateGlobalnetStatus = (
  brokers: SubmarinerBrokerKind[] | undefined,
  loaded: boolean,
  loadError: unknown,
  skipGlobalnetCheck: boolean
): GlobalnetCheckStatus => {
  if (skipGlobalnetCheck) {
    return GlobalnetCheckStatus.Skipped;
  }

  if (!loaded) {
    return GlobalnetCheckStatus.Checking;
  }

  if (loadError || !brokers?.length) {
    return GlobalnetCheckStatus.NotFound;
  }

  const broker =
    brokers.find((item) => getName(item) === SUBMARINER_BROKER_NAME) ??
    brokers[0];

  return broker?.spec?.globalnetEnabled
    ? GlobalnetCheckStatus.Enabled
    : GlobalnetCheckStatus.Disabled;
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

export const getClusterNetworkCidrsFromClaims = (
  clusterClaims?: ClusterClaim[]
): ClusterNetworkCidrs | null => {
  const networkClaim = clusterClaims?.find((claim) =>
    NETWORK_CLUSTER_CLAIM_NAMES.includes(
      claim.name as (typeof NETWORK_CLUSTER_CLAIM_NAMES)[number]
    )
  );
  return extractCidrsFromNetworkClaimValue(networkClaim?.value);
};

export const getClusterNetworkCidrsFromSubmarinerCluster = (
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

export const resolveClusterNetworkCidrs = (
  clusterName: string,
  clusterClaims?: ClusterClaim[],
  submarinerClusters?: SubmarinerClusterKind[]
): ClusterNetworkCidrs | null =>
  getClusterNetworkCidrsFromClaims(clusterClaims) ??
  getClusterNetworkCidrsFromSubmarinerCluster(clusterName, submarinerClusters);

export const evaluateGlobalnetRequirement = (
  clusters: ManagedClusterNetworkInfo[],
  submarinerClusters: SubmarinerClusterKind[] | undefined,
  submarinerClustersLoaded: boolean,
  skipGlobalnetCheck: boolean
): GlobalnetRequirement => {
  if (skipGlobalnetCheck) {
    return GlobalnetRequirement.Skipped;
  }

  if (
    !clusters.every((cluster) => cluster.loaded) ||
    !submarinerClustersLoaded
  ) {
    return GlobalnetRequirement.Checking;
  }

  const networkCidrs = clusters.map((cluster) =>
    resolveClusterNetworkCidrs(
      cluster.clusterName,
      cluster.clusterClaims,
      submarinerClusters
    )
  );

  if (networkCidrs.some((cidrs) => !cidrs)) {
    return GlobalnetRequirement.Unknown;
  }

  const [left, right] = networkCidrs as ClusterNetworkCidrs[];
  const hasOverlap =
    doCidrListsOverlap(left.clusterCidrs, right.clusterCidrs) ||
    doCidrListsOverlap(left.serviceCidrs, right.serviceCidrs);

  return hasOverlap
    ? GlobalnetRequirement.Required
    : GlobalnetRequirement.NotRequired;
};

export type GlobalnetPrePairResult = {
  status: GlobalnetCheckStatus;
  requirement: GlobalnetRequirement;
};

export const evaluateGlobalnetPrePair = (
  brokers: SubmarinerBrokerKind[] | undefined,
  brokersLoaded: boolean,
  brokersError: unknown,
  clusters: ManagedClusterNetworkInfo[],
  submarinerClusters: SubmarinerClusterKind[] | undefined,
  submarinerClustersLoaded: boolean,
  skipGlobalnetCheck: boolean
): GlobalnetPrePairResult => ({
  status: evaluateGlobalnetStatus(
    brokers,
    brokersLoaded,
    brokersError,
    skipGlobalnetCheck
  ),
  requirement: evaluateGlobalnetRequirement(
    clusters,
    submarinerClusters,
    submarinerClustersLoaded,
    skipGlobalnetCheck
  ),
});

export const isGlobalnetRequiredButNotEnabled = (
  status: GlobalnetCheckStatus,
  requirement: GlobalnetRequirement
): boolean =>
  requirement === GlobalnetRequirement.Required &&
  (status === GlobalnetCheckStatus.Disabled ||
    status === GlobalnetCheckStatus.NotFound);
