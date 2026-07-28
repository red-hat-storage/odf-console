import {
  MAX_ALLOWED_CLUSTERS,
  SubmarinerConditionType,
  SubmarinerStatus,
} from '@odf/mco/constants';
import { SubmarinerAddOnKind } from '@odf/mco/types';
import { findCondition, isConditionStatus } from '@odf/shared/selectors';
import {
  K8sResourceCondition,
  K8sResourceConditionStatus,
} from '@odf/shared/types';
import { isNotFoundError } from '@odf/shared/utils';

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
  // Caller (evaluateSubmarinerPrePair) returns Checking until every watch is loaded.

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
  const submarinerConditions = getSubmarinerConditions(conditions);

  // Degraded before Available→Progressing so Available=False + Degraded is not masked.
  if (isSubmarinerDegraded(submarinerConditions)) {
    return SubmarinerStatus.Degraded;
  }

  // Gateway labeling is setup state, not Connection/Agent degraded.
  if (areGatewayNodesUnlabeled(submarinerConditions)) {
    return SubmarinerStatus.GatewayNodesUnlabeled;
  }

  if (isSubmarinerHealthy(submarinerConditions)) {
    return SubmarinerStatus.Healthy;
  }

  // Available=False → install/config still settling.
  if (
    isConditionStatus(
      submarinerConditions.available,
      K8sResourceConditionStatus.False
    )
  ) {
    return SubmarinerStatus.Progressing;
  }

  // Missing or incomplete conditions
  return SubmarinerStatus.Unknown;
};

export const evaluateSubmarinerPrePair = (
  clusters: Array<{
    addon: SubmarinerAddOnKind | undefined;
    loaded: boolean;
    loadError: unknown;
  }>
): SubmarinerPrePairResult => {
  if (!clusters.every(({ loaded }) => loaded)) {
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

  const bothInstalled = statuses.every(
    (status) => status !== SubmarinerStatus.NotInstalled
  );
  if (!bothInstalled) {
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
    return { canProceed: false, status: SubmarinerStatus.Unknown };
  }

  if (statuses.every((status) => status === SubmarinerStatus.Healthy)) {
    return { canProceed: true, status: SubmarinerStatus.Healthy };
  }

  return { canProceed: false, status: SubmarinerStatus.Unknown };
};

export const shouldRunPrePairValidation = (
  selectedClusterCount: number,
  isClusterSelectionValid: boolean,
  isDataFoundation: boolean
): boolean =>
  isDataFoundation &&
  isClusterSelectionValid &&
  selectedClusterCount === MAX_ALLOWED_CLUSTERS;
