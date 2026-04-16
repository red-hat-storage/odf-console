import * as React from 'react';
import {
  DefaultEdge,
  Edge,
  EdgeStyle,
  EdgeTerminalType,
  observer,
  WithSelectionProps,
} from '@patternfly/react-topology';
import './MCOStyleEdge.scss';

type MCOStyleEdgeProps = {
  element: Edge;
} & Partial<WithSelectionProps & { hover?: boolean }>;

const MCOStyleEdgeComponent: React.FC<MCOStyleEdgeProps> = ({
  element,
  ...rest
}) => {
  // Simple non-directional edges - just connect the nodes naturally
  // No arrows, no specific anchor points, let layout engine route them
  return (
    <DefaultEdge
      element={element}
      {...rest}
      endTerminalType={EdgeTerminalType.none}
      startTerminalType={EdgeTerminalType.none}
      edgeStyle={EdgeStyle.dashed} // Dashed to show it's an operation in progress
      className="mco-topology-edge--active-operation"
    />
  );
};

export const MCOStyleEdge = observer(MCOStyleEdgeComponent);
