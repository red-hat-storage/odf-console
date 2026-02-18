import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { Node, observer, WithSelectionProps } from '@patternfly/react-topology';
import { ClusterActionMenu } from './ClusterActionMenu';
import './ClusterNodeLabel.scss';

type ClusterNodeLabelProps = {
  element: Node;
} & Partial<WithSelectionProps>;

const ClusterNodeLabelComponent: React.FC<ClusterNodeLabelProps> = ({
  element,
}) => {
  const data = element.getData();
  const cluster = data?.resource;
  const clusterName = getName(cluster);
  const { x, y } = element.getPosition();
  const { width, height } = element.getDimensions();

  // Position label below the node
  const labelY = y + height + 5;

  return (
    <foreignObject
      x={x}
      y={labelY}
      width={width + 40}
      height={40}
      className="cluster-node-label"
    >
      <div className="cluster-node-label__container">
        <span className="cluster-node-label__text">{clusterName}</span>
        <div className="cluster-node-label__actions">
          <ClusterActionMenu cluster={cluster} />
        </div>
      </div>
    </foreignObject>
  );
};

export const ClusterNodeLabel = observer(ClusterNodeLabelComponent);
