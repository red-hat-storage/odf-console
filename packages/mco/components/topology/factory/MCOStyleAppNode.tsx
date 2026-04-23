import * as React from 'react';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import { CogIcon } from '@patternfly/react-icons';
import {
  DEFAULT_DECORATOR_PADDING,
  DEFAULT_DECORATOR_RADIUS,
  Decorator,
  DefaultNode,
  Node,
  NodeModel,
  TopologyQuadrant,
  getDefaultShapeDecoratorCenter,
  observer,
  ScaleDetailsLevel,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { getEffectiveDRStatus } from '../../../utils/dr-status';
import { AppNodeData } from '../types';
import { renderDecorators } from '../utils/decorator-utils';
import { getDRNodeStatus } from '../utils/sidebar-utils';
import './MCOStyleAppNode.scss';

type MCOStyleAppNodeProps = {
  element: Node<NodeModel, AppNodeData>;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 25;

const renderCountDecorator = (
  element: Node<NodeModel, AppNodeData>,
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

const MCOStyleAppNodeComponent: React.FC<MCOStyleAppNodeProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();
  const detailsLevel = useDetailsLevel();
  const { width, height } = element.getDimensions();

  const appCount = data?.appCount || 1;

  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;

  // For static apps, appStatus is already a computed DRStatus - use it directly
  // For operation nodes, compute from phase/progression
  const effectiveStatus =
    data.isStatic && data.appStatus
      ? data.appStatus
      : getEffectiveDRStatus(data?.phase, data?.progression);
  const nodeStatus = getDRNodeStatus(effectiveStatus);
  const isOperation = !data?.isStatic && data?.isSource !== undefined;
  const animationClass = isOperation
    ? data.isSource
      ? 'mco-app-node--source'
      : 'mco-app-node--target'
    : undefined;

  const phaseDecorators = renderDecorators(element, data, true);

  return (
    <DefaultNode
      element={element}
      className={animationClass}
      scaleLabel={false}
      showLabel={showLabel}
      attachments={
        <>
          {renderCountDecorator(element, appCount)}
          {phaseDecorators}
        </>
      }
      nodeStatus={nodeStatus}
      badge="DRPC"
      {...rest}
    >
      <g
        transform={`translate(${(width - ICON_SIZE) / 2}, ${
          (height - ICON_SIZE) / 2
        })`}
      >
        <CogIcon width={ICON_SIZE} height={ICON_SIZE} />
      </g>
    </DefaultNode>
  );
};

export const MCOStyleAppNode = observer(MCOStyleAppNodeComponent);
