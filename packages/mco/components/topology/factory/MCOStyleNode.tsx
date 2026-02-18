import * as React from 'react';
import { ACMManagedClusterModel } from '@odf/shared';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import {
  DEFAULT_LAYER,
  DefaultNode,
  Layer,
  Node,
  observer,
  ScaleDetailsLevel,
  TOP_LAYER,
  useHover,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { ClusterNodeLabel } from '../components/ClusterNodeLabel';
import './MCOStyleNode.scss';

type MCOStyleNodeProps = {
  element: Node;
} & Partial<WithSelectionProps>;

const MCOStyleNodeComponent: React.FC<MCOStyleNodeProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();
  const [hover, hoverRef] = useHover();
  const detailsLevel = useDetailsLevel();

  const showLabel = hover || detailsLevel !== ScaleDetailsLevel.low;

  return (
    <Layer id={hover ? TOP_LAYER : DEFAULT_LAYER}>
      <g ref={hoverRef}>
        <DefaultNode
          element={element}
          scaleLabel={false} // We'll handle label ourselves
          showLabel={false} // We'll use custom label
          {...rest}
          {...data}
        >
          {/* Render cluster icon/badge */}
          {(hover || detailsLevel !== ScaleDetailsLevel.low) && (
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              className="mco-topology-node__badge"
            >
              {ACMManagedClusterModel.abbr || 'CL'}
            </text>
          )}
        </DefaultNode>
        {/* Custom label with kebab menu */}
        {showLabel && <ClusterNodeLabel element={element} />}
      </g>
    </Layer>
  );
};

export const MCOStyleNode = observer(MCOStyleNodeComponent);
