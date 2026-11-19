import * as React from 'react';
import { useScheduler } from '@odf/shared/hooks';
import { getAnnotations } from '@odf/shared/selectors';
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
import { TEST_FAILOVER_DRYRUN_ANNOTATION } from '../../../constants';
import { DRPlacementControlKind, Progression } from '../../../types';
import { drpcHasVolumes, getProtectedCondition } from '../../../utils';
import { getDRStatus, isUserActionRequired } from '../../../utils/dr-status';
import { isRevertingTestFailover } from '../../../utils/test-failover';
import { FailoverNodeData } from '../types';
import { getDRNodeStatus } from '../utils/sidebar-utils';
import '../utils/decorator-utils.scss';

const hasTestFailoverAnnotation = (drpc?: DRPlacementControlKind): boolean =>
  getAnnotations(drpc)?.[TEST_FAILOVER_DRYRUN_ANNOTATION] === 'true';

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
      schedulingInterval: op.schedulingInterval,
      action: op.action,
      dryRun: op.drpc?.spec?.dryRun,
      hasTestFailoverAnnotation: hasTestFailoverAnnotation(op.drpc),
      hasVolumes: drpcHasVolumes(op.drpc),
      isRevertingTestFailover: isRevertingTestFailover(op.drpc),
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

  // Re-evaluate test sync lag on an interval (same as popover / node-generator).
  const needsLagTick = operations.some(
    (op) =>
      !!op.drpc?.spec?.dryRun && op.progression !== Progression.TestingFailover
  );
  const [lagTick, setLagTick] = React.useState(0);
  const bumpLagTick = React.useCallback(() => {
    if (!needsLagTick) return;
    setLagTick((tick) => tick + 1);
  }, [needsLagTick]);
  useScheduler(bumpLagTick, needsLagTick ? undefined : null);

  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;
  // lagTick forces getDRStatus to re-run when sync age crosses the threshold.
  const nodeStatus = React.useMemo(
    () => getFailoverNodeStatus(data),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lagTick forces lag re-eval
    [data, lagTick]
  );
  const action = data.action || 'Failover';
  const needsUserAction = React.useMemo(
    () =>
      operations.some((op) => {
        const protectedCondition = getProtectedCondition(op.drpc);
        return isUserActionRequired(
          getDRStatus({
            phase: op.phase,
            progression: op.progression,
            protectedCondition,
            volumeLastGroupSyncTime: op.drpc?.status?.lastGroupSyncTime,
            schedulingInterval: op.schedulingInterval,
            action: op.action,
            dryRun: op.drpc?.spec?.dryRun,
            hasTestFailoverAnnotation: hasTestFailoverAnnotation(op.drpc),
            hasVolumes: drpcHasVolumes(op.drpc),
            isRevertingTestFailover: isRevertingTestFailover(op.drpc),
          })
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lagTick forces lag re-eval
    [operations, lagTick]
  );
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
