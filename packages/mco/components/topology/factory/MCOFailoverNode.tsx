import * as React from 'react';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import { ExchangeAltIcon } from '@patternfly/react-icons';
import {
  DefaultNode,
  Node,
  observer,
  ScaleDetailsLevel,
  WithSelectionProps,
} from '@patternfly/react-topology';
import './MCOFailoverNode.scss';

type MCOFailoverNodeProps = {
  element: Node;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 40;

const MCOFailoverNodeComponent: React.FC<MCOFailoverNodeProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();
  const detailsLevel = useDetailsLevel();
  const { width, height } = element.getDimensions();

  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;
  const operationCount = data?.operationCount || 0;

  return (
    <g className="mco-failover-node">
      <DefaultNode
        element={element}
        scaleLabel={false}
        showLabel={showLabel}
        {...rest}
        {...data}
        showStatusDecorator={false} // Disable built-in decorator
      >
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={width / 2}
          fill="#f0ab00"
          opacity={0.9}
          stroke="#c98a00"
          strokeWidth="2"
        />

        {/* Failover icon */}
        <g
          transform={`translate(${(width - ICON_SIZE) / 2}, ${
            (height - ICON_SIZE) / 2
          })`}
        >
          <ExchangeAltIcon width={ICON_SIZE} height={ICON_SIZE} color="white" />
        </g>

        {/* Operation count badge */}
        {operationCount > 1 && (
          <g transform={`translate(${width - 8}, 8)`}>
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
              {operationCount}
            </text>
          </g>
        )}
      </DefaultNode>
    </g>
  );
};

export const MCOFailoverNode = observer(MCOFailoverNodeComponent);
