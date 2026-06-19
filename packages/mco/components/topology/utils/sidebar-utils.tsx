import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { referenceForModel } from '@odf/shared/utils';
import { InProgressIcon } from '@patternfly/react-icons';
import { t_color_blue_40 as blueInfoColor } from '@patternfly/react-tokens';
import { NodeStatus } from '@patternfly/react-topology';
import { ClusterPairPoliciesMap } from '../../../hooks/useDRPoliciesByClusterPair';
import { DRPolicyKind } from '../../../types';
import {
  getReplicationHealth,
  getReplicationType,
  getProtectedCondition,
} from '../../../utils';
import {
  DRStatus,
  getDRStatus,
  isCleanupRequired,
  isUserActionRequired as isUserActionRequiredUtil,
} from '../../../utils/dr-status';
import { DROperationInfo } from '../types';

/**
 * Builds a map of DR policy name → DRPolicyKind from the cluster pair policies map.
 */
export const buildDRPolicyByName = (
  clusterPairPoliciesMap?: ClusterPairPoliciesMap
): Map<string, DRPolicyKind> => {
  const map = new Map<string, DRPolicyKind>();
  if (!clusterPairPoliciesMap) return map;
  Object.values(clusterPairPoliciesMap).forEach((policies) => {
    policies.forEach((policyInfo) => {
      if (policyInfo.policy?.metadata?.name) {
        map.set(policyInfo.policy.metadata.name, policyInfo.policy);
      }
    });
  });
  return map;
};

/**
 * Computes the full DR status for an operation using all available data.
 * Mirrors the computation in node-generator's computeOperationDRStatus.
 */
export const getOperationDRStatus = (
  op: DROperationInfo,
  drPolicyByName: Map<string, DRPolicyKind>
): DRStatus => {
  const drpc = op.drpc;
  const drPolicyName = drpc?.spec?.drPolicyRef?.name;
  const drPolicy = drPolicyName ? drPolicyByName.get(drPolicyName) : undefined;
  const schedulingInterval = drPolicy?.spec?.schedulingInterval;
  const protectedCondition = getProtectedCondition(drpc);
  const volumeLastGroupSyncTime = drpc?.status?.lastGroupSyncTime;

  const volumeReplicationHealth =
    volumeLastGroupSyncTime && schedulingInterval
      ? getReplicationHealth(
          volumeLastGroupSyncTime,
          schedulingInterval,
          drPolicy ? getReplicationType(drPolicy) : undefined
        )
      : undefined;

  const kubeObjectSchedulingInterval =
    drpc?.spec?.kubeObjectProtection?.captureInterval;
  const kubeObjectReplicationHealth =
    kubeObjectSchedulingInterval && drpc?.status?.lastKubeObjectProtectionTime
      ? getReplicationHealth(
          drpc.status.lastKubeObjectProtectionTime,
          kubeObjectSchedulingInterval
        )
      : undefined;

  return getDRStatus({
    isCleanupRequired: isCleanupRequired(
      drpc?.status?.phase,
      drpc?.status?.progression
    ),
    phase: op.phase,
    volumeReplicationHealth,
    kubeObjectReplicationHealth,
    progression: op.progression,
    volumeLastGroupSyncTime,
    protectedCondition,
    schedulingInterval,
    actionStartTime: drpc?.status?.actionStartTime,
    action: op.action,
  });
};

export const getAppLink = (name: string, namespace: string) => {
  return `/k8s/ns/${namespace}/${referenceForModel(DRPlacementControlModel)}/${name}`;
};

/**
 * Maps DR status to PatternFly NodeStatus for topology display.
 * Consolidated status classification for consistency across topology components.
 */
export const getDRNodeStatus = (status: DRStatus): NodeStatus => {
  // Success states
  if (
    status === DRStatus.Healthy ||
    status === DRStatus.Available ||
    status === DRStatus.FailedOver ||
    status === DRStatus.Relocated
  ) {
    return NodeStatus.success;
  }

  // In-progress states
  if (
    status === DRStatus.FailingOver ||
    status === DRStatus.Relocating ||
    status === DRStatus.Deleting ||
    status === DRStatus.Protecting
  ) {
    return NodeStatus.info;
  }

  // Warning states
  if (status === DRStatus.Warning) {
    return NodeStatus.warning;
  }

  // Danger states (includes user action required — matches protected-applications)
  if (
    status === DRStatus.Critical ||
    status === DRStatus.Unknown ||
    status === DRStatus.ProtectionError ||
    status === DRStatus.WaitOnUserToCleanUp ||
    status === DRStatus.WaitForUser
  ) {
    return NodeStatus.danger;
  }

  // Default to warning for unhandled cases
  // eslint-disable-next-line no-console
  console.warn(`Unhandled DR status in topology: ${status}`);
  return NodeStatus.warning;
};

/**
 * Checks if a DR status requires user action.
 */
export const isDRStatusUserActionRequired = isUserActionRequiredUtil;

export const DRStatusIcon: React.FC<{ status: DRStatus }> = ({ status }) => {
  // Danger states (includes user action required — matches protected-applications)
  if (
    status === DRStatus.Critical ||
    status === DRStatus.Unknown ||
    status === DRStatus.ProtectionError ||
    status === DRStatus.WaitOnUserToCleanUp ||
    status === DRStatus.WaitForUser
  ) {
    return (
      <>
        <RedExclamationCircleIcon />
        <span>{status}</span>
      </>
    );
  }

  // Success states
  if (
    status === DRStatus.FailedOver ||
    status === DRStatus.Relocated ||
    status === DRStatus.Healthy ||
    status === DRStatus.Available
  ) {
    return (
      <>
        <GreenCheckCircleIcon />
        <span>{status}</span>
      </>
    );
  }

  // In-progress states
  if (
    status === DRStatus.FailingOver ||
    status === DRStatus.Relocating ||
    status === DRStatus.Deleting ||
    status === DRStatus.Protecting
  ) {
    return (
      <>
        <InProgressIcon color={blueInfoColor.value} />
        <span>{status}</span>
      </>
    );
  }

  // Warning states
  if (status === DRStatus.Warning) {
    return (
      <>
        <YellowExclamationTriangleIcon />
        <span>{status}</span>
      </>
    );
  }

  // Default - just show the status text
  return <span>{status}</span>;
};
