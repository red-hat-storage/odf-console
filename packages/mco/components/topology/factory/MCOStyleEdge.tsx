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
  // Directional edges with arrows to show operation direction clearly
  return (
    <DefaultEdge
      element={element}
      {...rest}
      endTerminalType={EdgeTerminalType.directional}
      startTerminalType={EdgeTerminalType.none}
      edgeStyle={EdgeStyle.solid}
      className="mco-topology-edge--active-operation"
    />
  );
};

export const MCOStyleEdge = observer(MCOStyleEdgeComponent);
