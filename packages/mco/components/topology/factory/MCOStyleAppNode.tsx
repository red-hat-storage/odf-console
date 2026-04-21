import * as React from 'react';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import { CubeIcon } from '@patternfly/react-icons';
import {
  DefaultNode,
  Node,
  observer,
  ScaleDetailsLevel,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { renderDecorators } from '../utils/decorator-utils';
import './MCOStyleAppNode.scss';

type MCOStyleAppNodeProps = {
  element: Node;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 40;

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
        attachments={renderDecorators(element, data, true)}
        {...rest}
      >
        {/* Background circle with opacity and border */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={width / 2}
          fill={
            isStatic
              ? 'var(--pf-v6-global--primary-color--100)'
              : isSource
                ? 'var(--pf-v6-global--warning-color--100)'
                : 'var(--pf-v6-global--primary-color--100)'
          }
          opacity={opacity}
          stroke={
            isStatic
              ? 'var(--pf-v6-global--primary-color--200)'
              : isSource
                ? 'var(--pf-v6-global--warning-color--200)'
                : 'var(--pf-v6-global--primary-color--200)'
          }
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
            <circle
              r="10"
              fill="var(--pf-v6-global--BackgroundColor--dark--100)"
              stroke="var(--pf-v6-global--BackgroundColor--100)"
              strokeWidth="2"
            />
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontWeight="bold"
              fill="var(--pf-v6-global--BackgroundColor--100)"
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
