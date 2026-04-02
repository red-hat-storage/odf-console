import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import { ClusterIcon, CubeIcon, LayerGroupIcon } from '@patternfly/react-icons';
import {
  DefaultNode,
  Node,
  observer,
  ScaleDetailsLevel,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { ClusterContextMenu } from '../components/ClusterContextMenu';
import { TopologyDataContext } from '../context/TopologyContext';
import { useClusterContextMenu } from '../hooks/useClusterContextMenu';
import { renderDecorators } from '../utils/decorator-utils';
import './MCOStyleNode.scss';

type MCOStyleNodeProps = {
  element: Node;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 60;

const MCOStyleNodeComponent: React.FC<MCOStyleNodeProps> = ({
  element,
  ...rest
}) => {
  const {
    clusterAppsMap,
    clusterPairOperationsMap,
    clusters,
    onOpenPairModal,
  } = React.useContext(TopologyDataContext);
  const data = element.getData();
  const detailsLevel = useDetailsLevel();
  const { width, height } = element.getDimensions();

  // Get cluster name and check for protected apps
  const clusterName = getName(data.resource);

  // Use the shared context menu hook with modal callback
  const { state, handlers } = useClusterContextMenu(
    clusterName,
    'cluster-node-menu-root',
    {
      onPairCluster: onOpenPairModal,
    }
  );

  // DefaultNode handles hover internally, we get it from rest props
  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;

  const allProtectedApps = clusterAppsMap?.[clusterName] || [];

  // Get list of apps currently in transit (being moved)
  const movingAppNames = new Set<string>();
  if (clusterPairOperationsMap) {
    Object.values(clusterPairOperationsMap).forEach((operations) => {
      operations.forEach((op) => {
        // Include apps moving from or to this cluster
        if (
          op.sourceCluster === clusterName ||
          op.targetCluster === clusterName
        ) {
          movingAppNames.add(op.applicationName);
        }
      });
    });
  }

  // Filter out moving apps - only show static protected apps
  const protectedApps = allProtectedApps.filter(
    (app) => !movingAppNames.has(app.name)
  );
  const appCount = protectedApps.length;

  // Get other clusters that can be paired with
  const otherClusters = clusters.filter(
    (cluster) => getName(cluster) !== clusterName
  );

  // Determine which icon to show
  const IconComponent =
    appCount === 0 ? ClusterIcon : appCount === 1 ? CubeIcon : LayerGroupIcon;

  return (
    <>
      <g>
        <DefaultNode
          element={element}
          scaleLabel={false}
          showLabel={showLabel}
          onContextMenu={handlers.handleContextMenu}
          contextMenuOpen={state.contextMenuOpen}
          attachments={renderDecorators(element, data, true)}
          {...rest}
        >
          {/* Render icon inside the node */}
          <g
            transform={`translate(${(width - ICON_SIZE) / 2}, ${
              (height - ICON_SIZE) / 2
            })`}
          >
            <IconComponent width={ICON_SIZE} height={ICON_SIZE} />
          </g>
          {/* Render app count badge for multiple apps */}
          {appCount > 1 && (
            <g transform={`translate(${width - 20}, 5)`}>
              <circle r="12" fill="var(--pf-v6-global--primary-color--100)" />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--pf-v6-global--BackgroundColor--100)"
                fontSize="12"
                fontWeight="bold"
              >
                {appCount}
              </text>
            </g>
          )}
        </DefaultNode>
      </g>
      {/* Render drilldown menu using portal */}
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
