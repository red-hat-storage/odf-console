import * as React from 'react';
import { validateManagedClusterCondition } from '@odf/mco/utils';
import { getName } from '@odf/shared/selectors';
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
import { ClusterContextMenu } from '../components/ClusterContextMenu';
import { TopologyDataContext } from '../context/TopologyContext';
import { useClusterContextMenu } from '../hooks/useClusterContextMenu';
import './MCOStyleNode.scss';

type MCOStyleNodeProps = {
  element: Node;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 45;

const MCOStyleNodeComponent: React.FC<MCOStyleNodeProps> = ({
  element,
  ...rest
}) => {
  const { clusterPairOperationsMap, clusters, onOpenPairModal } =
    React.useContext(TopologyDataContext);
  const data = element.getData();
  const detailsLevel = useDetailsLevel();
  const { width, height } = element.getDimensions();
  const clusterName = getName(data.resource);

  const isHealthy = validateManagedClusterCondition(
    data.resource,
    MANAGED_CLUSTER_CONDITION_AVAILABLE
  );
  const nodeStatus = isHealthy ? NodeStatus.success : NodeStatus.danger;
  const statusTooltip = isHealthy
    ? 'Cluster is healthy'
    : 'Cluster is unhealthy';

  const { state, handlers } = useClusterContextMenu(
    clusterName,
    'cluster-node-menu-root',
    {
      onPairCluster: onOpenPairModal,
    }
  );

  // DefaultNode handles hover internally, we get it from rest props
  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;

  const movingAppNames = new Set<string>();
  if (clusterPairOperationsMap) {
    Object.values(clusterPairOperationsMap).forEach((operations) => {
      operations.forEach((op) => {
        if (
          op.sourceCluster === clusterName ||
          op.targetCluster === clusterName
        ) {
          movingAppNames.add(op.applicationName);
        }
      });
    });
  }

  // Get other clusters that can be paired with
  const otherClusters = clusters.filter(
    (cluster) => getName(cluster) !== clusterName
  );

  return (
    <>
      <DefaultNode
        element={element}
        scaleLabel={false}
        showLabel={showLabel}
        onContextMenu={handlers.handleContextMenu}
        contextMenuOpen={state.contextMenuOpen}
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
      <ClusterContextMenu
        state={state}
        handlers={handlers}
        otherClusters={otherClusters}
        rootMenuId="cluster-node-menu-root"
      />
    </>
  );
};

export const MCOStyleNode = observer(MCOStyleNodeComponent);
