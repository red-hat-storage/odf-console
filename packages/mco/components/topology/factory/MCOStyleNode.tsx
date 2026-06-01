import * as React from 'react';
import { validateManagedClusterCondition } from '@odf/mco/utils';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import { TopologyIcon } from '@patternfly/react-icons';
import {
  DefaultNode,
  Node,
  NodeStatus,
  observer,
  ScaleDetailsLevel,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { MANAGED_CLUSTER_CONDITION_AVAILABLE } from '../../../constants';
import './MCOStyleNode.scss';

type MCOStyleNodeProps = {
  element: Node;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 45;

const MCOStyleNodeComponent: React.FC<MCOStyleNodeProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();
  const detailsLevel = useDetailsLevel();
  const { width, height } = element.getDimensions();

  const isHealthy = validateManagedClusterCondition(
    data.resource,
    MANAGED_CLUSTER_CONDITION_AVAILABLE
  );
  const nodeStatus = isHealthy ? NodeStatus.success : NodeStatus.danger;
  const statusTooltip = isHealthy
    ? 'Cluster is healthy'
    : 'Cluster is unhealthy';

  // DefaultNode handles hover internally, we get it from rest props
  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;

  return (
    <DefaultNode
      element={element}
      scaleLabel={false}
      showLabel={showLabel}
      nodeStatus={nodeStatus}
      showStatusDecorator={detailsLevel === ScaleDetailsLevel.high}
      statusDecoratorTooltip={statusTooltip}
      onStatusDecoratorClick={() => null}
      {...rest}
    >
      <g
        transform={`translate(${(width - ICON_SIZE) / 2}, ${
          (height - ICON_SIZE) / 2
        })`}
      >
        <TopologyIcon width={ICON_SIZE} height={ICON_SIZE} />
      </g>
    </DefaultNode>
  );
};

export const MCOStyleNode = observer(MCOStyleNodeComponent);
