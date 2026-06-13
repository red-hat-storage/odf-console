import * as React from 'react';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import { ExclamationCircleIcon, SyncAltIcon } from '@patternfly/react-icons';
import {
  DEFAULT_DECORATOR_PADDING,
  DEFAULT_DECORATOR_RADIUS,
  Decorator,
  DefaultNode,
  Node,
  NodeModel,
  NodeStatus,
  TopologyQuadrant,
  getDefaultShapeDecoratorCenter,
  observer,
  ScaleDetailsLevel,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { getProtectedCondition } from '../../../utils';
import { getDRStatus, isUserActionRequired } from '../../../utils/dr-status';
import { FailoverNodeData } from '../types';
import { getDRNodeStatus } from '../utils/sidebar-utils';
import '../utils/decorator-utils.scss';

type MCOFailoverNodeProps = {
  element: Node<NodeModel, FailoverNodeData>;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 25;

/**
 * Determines the aggregate status of a failover node from its operations,
 * using effective DR status (phase + progression) for each operation.
 * Priority: danger > info (in-progress) > success.
 */
const getFailoverNodeStatus = (data: FailoverNodeData): NodeStatus => {
  const operations = data.operations || [];
  if (operations.length === 0) return NodeStatus.info;

  let hasInfo = false;
  let allSuccess = true;

  for (const op of operations) {
    const protectedCondition = getProtectedCondition(op.drpc);
    const effectiveStatus = getDRStatus({
      phase: op.phase,
      progression: op.progression,
      protectedCondition,
      volumeLastGroupSyncTime: op.drpc?.status?.lastGroupSyncTime,
      action: op.action,
    });
    const nodeStatus = getDRNodeStatus(effectiveStatus);

    // Priority: danger > info > success
    if (nodeStatus === NodeStatus.danger) {
      return NodeStatus.danger;
    }

    if (nodeStatus === NodeStatus.info) {
      hasInfo = true;
      allSuccess = false;
    } else if (nodeStatus === NodeStatus.warning) {
      allSuccess = false;
    } else if (nodeStatus !== NodeStatus.success) {
      allSuccess = false;
    }
  }

  if (allSuccess) return NodeStatus.success;
  if (hasInfo) return NodeStatus.info;
  return NodeStatus.info;
};

const renderCountDecorator = (
  element: Node<NodeModel, FailoverNodeData>,
  count: number
): React.ReactNode => {
  const { x, y } = getDefaultShapeDecoratorCenter(
    TopologyQuadrant.upperRight,
    element
  );

  return (
    <Decorator
      x={x}
      y={y}
      radius={DEFAULT_DECORATOR_RADIUS}
      showBackground
      icon={
        <text
          x={DEFAULT_DECORATOR_RADIUS - DEFAULT_DECORATOR_PADDING}
          y={DEFAULT_DECORATOR_RADIUS - DEFAULT_DECORATOR_PADDING}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fontWeight="bold"
        >
          {count}
        </text>
      }
    />
  );
};

const MCOFailoverNodeComponent: React.FC<MCOFailoverNodeProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();
  const detailsLevel = useDetailsLevel();
  const { width, height } = element.getDimensions();

  // Use operations array length as source of truth for count
  const operations = data.operations || [];
  const operationCount = operations.length;
  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;
  const nodeStatus = getFailoverNodeStatus(data);
  const action = data.action || 'Failover';
  const needsUserAction = operations.some((op) => {
    const protectedCondition = getProtectedCondition(op.drpc);
    return isUserActionRequired(
      getDRStatus({
        phase: op.phase,
        progression: op.progression,
        protectedCondition,
        volumeLastGroupSyncTime: op.drpc?.status?.lastGroupSyncTime,
        action: op.action,
      })
    );
  });
  const label = needsUserAction ? 'Action required' : action;
  const statusTooltip = `${action} operation${operationCount > 1 ? 's' : ''}`;

  return (
    <DefaultNode
      element={element}
      scaleLabel={false}
      showLabel={showLabel}
      attachments={
        operationCount > 1
          ? renderCountDecorator(element, operationCount)
          : undefined
      }
      nodeStatus={nodeStatus}
      showStatusDecorator={detailsLevel === ScaleDetailsLevel.high}
      statusDecoratorTooltip={statusTooltip}
      label={label}
      onStatusDecoratorClick={() => null}
      {...rest}
    >
      <g
        transform={`translate(${(width - ICON_SIZE) / 2}, ${
          (height - ICON_SIZE) / 2
        })`}
      >
        {needsUserAction ? (
          <ExclamationCircleIcon
            width={ICON_SIZE}
            height={ICON_SIZE}
            style={{ fill: 'var(--pf-t--global--color--status--danger--100)' }}
          />
        ) : (
          <g className="mco-decorator-icon--spinning">
            <SyncAltIcon width={ICON_SIZE} height={ICON_SIZE} />
          </g>
        )}
      </g>
    </DefaultNode>
  );
};

export const MCOFailoverNode = observer(MCOFailoverNodeComponent);
