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

  // Use PatternFly's exact positioning formula for bottom labels
  // From DefaultNode.tsx lines 344-346:
  // labelPaddingY = 4
  // labelY = height + labelPaddingY + labelPaddingY / 2 = height + 6
  const labelPaddingY = 4;
  const labelY = y + height + labelPaddingY + labelPaddingY / 2;

  // Center the label horizontally
  // Estimate label width based on text length + kebab
  const estimatedTextWidth = clusterName.length * 7; // Rough estimate: 7px per character
  const kebabWidth = 24; // Approximate kebab icon width
  const gap = 8; // Gap between text and kebab
  const totalLabelWidth = estimatedTextWidth + gap + kebabWidth;
  const labelX = x + width / 2 - totalLabelWidth / 2;

  return (
    <foreignObject
      x={labelX}
      y={labelY}
      width={totalLabelWidth + 20} // Add some extra width for padding
      height={30}
      className="cluster-node-label"
      style={{ overflow: 'visible' }}
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
