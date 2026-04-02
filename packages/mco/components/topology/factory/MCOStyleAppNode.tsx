import * as React from 'react';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import { Tooltip } from '@patternfly/react-core';
import {
  CubeIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import {
  DefaultNode,
  Node,
  observer,
  ScaleDetailsLevel,
  WithSelectionProps,
  Decorator,
  DEFAULT_DECORATOR_RADIUS,
  getDefaultShapeDecoratorCenter,
} from '@patternfly/react-topology';
import './MCOStyleAppNode.scss';

type MCOStyleAppNodeProps = {
  element: Node;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 40;

const getDecoratorIcon = (icon: string): React.ReactNode => {
  switch (icon) {
    case 'check-circle':
      return (
        <CheckCircleIcon
          style={{ fill: 'var(--pf-v6-global--success-color--100)' }}
        />
      );
    case 'exclamation-circle':
      return (
        <ExclamationCircleIcon
          style={{ fill: 'var(--pf-v6-global--danger-color--100)' }}
        />
      );
    case 'exclamation-triangle':
      return (
        <ExclamationTriangleIcon
          style={{ fill: 'var(--pf-v6-global--warning-color--100)' }}
        />
      );
    case 'in-progress':
      return (
        <InProgressIcon
          style={{ fill: 'var(--pf-v6-global--info-color--100)' }}
        />
      );
    default:
      return null;
  }
};

const renderDecorators = (element: Node, data: any): React.ReactNode => {
  const decorators = data.decorators;
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return null;
  }

  return (
    <>
      {decorators.map((decorator: any, index: number) => {
        const { quadrant, icon, tooltip } = decorator;
        const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
        const decoratorRef = React.createRef<SVGGElement>();

        const decoratorIcon = icon ? getDecoratorIcon(icon) : null;

        return (
          <React.Fragment key={`decorator-${index}`}>
            <Tooltip content={tooltip} triggerRef={decoratorRef} />
            <Decorator
              innerRef={decoratorRef}
              x={x}
              y={y}
              radius={DEFAULT_DECORATOR_RADIUS}
              showBackground
              icon={decoratorIcon}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

const MCOStyleAppNodeComponent: React.FC<MCOStyleAppNodeProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();
  const detailsLevel = useDetailsLevel();
  const { width, height } = element.getDimensions();

  const isSource = data?.isSource;
  const isStatic = data?.isStatic && !data?.operation && !data?.operations;
  const appCount = data?.appCount || 1;

  // DefaultNode handles hover internally
  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;

  // Determine opacity - source fades as operation progresses, target becomes solid
  // For static apps, use full opacity
  const opacity = isStatic ? 1 : isSource ? 0.6 : 0.9;

  // Show count badge if grouped (multiple apps with same status or multiple operations)
  const showCountBadge = appCount > 1;

  return (
    <g
      className={`mco-app-node ${isSource ? 'mco-app-node--source' : 'mco-app-node--target'}`}
    >
      <DefaultNode
        element={element}
        scaleLabel={false}
        showLabel={showLabel}
        attachments={renderDecorators(element, data)}
        {...rest}
        {...data}
        showStatusDecorator={false} // Disable built-in decorator, we use attachments (must be after spreads)
      >
        {/* Background circle with opacity and border */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={width / 2}
          fill={isStatic ? '#06c' : isSource ? '#f0ab00' : '#06c'}
          opacity={opacity}
          stroke={isStatic ? '#004080' : isSource ? '#c98a00' : '#004080'}
          strokeWidth="2"
        />

        {/* App icon */}
        <g
          transform={`translate(${(width - ICON_SIZE) / 2}, ${
            (height - ICON_SIZE) / 2
          })`}
        >
          <CubeIcon width={ICON_SIZE} height={ICON_SIZE} color="white" />
        </g>

        {/* App count badge - show if multiple apps with same status */}
        {showCountBadge && (
          <g transform={`translate(${width - 8}, ${height - 8})`}>
            <circle r="10" fill="#151515" stroke="white" strokeWidth="2" />
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontWeight="bold"
              fill="white"
            >
              {appCount}
            </text>
          </g>
        )}
      </DefaultNode>
    </g>
  );
};

export const MCOStyleAppNode = observer(MCOStyleAppNodeComponent);
