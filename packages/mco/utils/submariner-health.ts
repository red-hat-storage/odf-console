import {
  MAX_ALLOWED_CLUSTERS,
  SUBMARINER_CONDITION_TYPES,
  SubmarinerStatus,
} from '@odf/mco/constants';
import { SubmarinerAddOnKind } from '@odf/mco/types';
import { findCondition, isConditionStatus } from '@odf/shared/selectors';
import { K8sResourceConditionStatus } from '@odf/shared/types';
import { isNotFoundError } from '@odf/shared/utils';

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
  const available = findCondition(
    conditions,
    SUBMARINER_CONDITION_TYPES.AVAILABLE,
    { ignoreCase: true }
  );
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

  const bothInstalled = statuses.every(
    (status) => status !== SubmarinerStatus.NotInstalled
  );
  if (!bothInstalled) {
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

export const shouldRunPrePairValidation = (
  selectedClusterCount: number,
  isClusterSelectionValid: boolean,
  isDataFoundation: boolean
): boolean =>
  isDataFoundation &&
  isClusterSelectionValid &&
  selectedClusterCount === MAX_ALLOWED_CLUSTERS;
