import { DeploymentKind, NodeCondition, NodeKind } from '@odf/shared/types';
import * as _ from 'lodash-es';
import { NodeStatus } from '@patternfly/react-topology';

const isNodeReady = (node: NodeKind): boolean => {
  const conditions = node?.status?.conditions || [];
  const readyState = _.find(conditions, { type: 'Ready' }) as NodeCondition;

  return readyState && readyState.status === 'True';
};

const enum Condition {
  DISK_PRESSURE = 'DiskPressure',
  PID_PRESSURE = 'PIDPressure',
  MEM_PRESSURE = 'MemoryPressure',
}

const isMonitoredCondition = (condition: Condition): boolean =>
  [
    Condition.DISK_PRESSURE,
    Condition.MEM_PRESSURE,
    Condition.PID_PRESSURE,
  ].includes(condition);

const getDegradedStates = (node: NodeKind): Condition[] => {
  return node?.status?.conditions
    ?.filter(
      ({ status, type }) =>
        status === 'True' && isMonitoredCondition(type as Condition)
    )
    .map(({ type }) => type as Condition);
};

export const getNodeStatus = (
  node: NodeKind,
  deployments: DeploymentKind[]
) => {
  // Check node is ready and no pressure in node
  const isDegraded: boolean = getDegradedStates(node)?.length > 0;
  const isNodeUp: boolean = isNodeReady(node);

  const nonAvailableDeployments = deployments?.filter((deployment) => {
    const deploymentAvailabilityCondition =
      deployment?.status?.conditions?.find(
        (condition) => condition.type === 'Available'
      ).status;
    return deploymentAvailabilityCondition !== 'True';
  });

  if (isDegraded || !isNodeUp) {
    return NodeStatus.danger;
  }
  if (nonAvailableDeployments.length > 0) {
    return NodeStatus.warning;
  }
  return NodeStatus.success;
};
