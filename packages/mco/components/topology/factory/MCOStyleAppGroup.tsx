import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import classNames from 'classnames';
import {
  DefaultGroup,
  Node,
  observer,
  WithContextMenuProps,
  WithDragNodeProps,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { ClusterContextMenu } from '../components/ClusterContextMenu';
import { TopologyDataContext } from '../context/TopologyContext';
import { useClusterContextMenu } from '../hooks/useClusterContextMenu';
import './MCOStyleAppGroup.scss';

type MCOStyleAppGroupProps = {
  element: Node;
} & Partial<WithContextMenuProps & WithDragNodeProps & WithSelectionProps>;

const MCOStyleAppGroup: React.FunctionComponent<MCOStyleAppGroupProps> = ({
  element,
  ...rest
}) => {
  const { clusters, onOpenPairModal } = React.useContext(TopologyDataContext);
  const data = element.getData();

  // Get current cluster name
  const currentClusterName = data.isClusterGroup ? getName(data.resource) : '';

  // Use the shared context menu hook with modal callback
  const { state, handlers } = useClusterContextMenu(
    currentClusterName,
    'cluster-menu-root',
    {
      onPairCluster: onOpenPairModal,
    }
  );

  const classes = classNames('mco-topology__app-group', {
    'mco-topology__app-group--cluster': data.isClusterGroup,
    'mco-topology__app-group--single': data.isSingleApp,
    'mco-topology__app-group--stacked':
      !data.isSingleApp && !data.isClusterGroup,
  });

  // For cluster groups, pass badge props to DefaultGroup
  // Note: We manually render decorators, so don't pass showStatusDecorator
  const groupProps = data.isClusterGroup
    ? {
        badge: data.badge,
        badgeColor: data.badgeColor,
        badgeTextColor: data.badgeTextColor,
        badgeBorderColor: data.badgeBorderColor,
        badgeClassName: data.badgeClassName,
      }
    : {};

  // Get other clusters that can be paired with
  const otherClusters = clusters.filter(
    (cluster) => getName(cluster) !== currentClusterName
  );

  return (
    <>
      <g>
        <DefaultGroup
          className={classes}
          element={element}
          collapsible={false}
          showLabel={true} // Show cluster group label at the bottom
          hulledOutline={false}
          onContextMenu={
            data.isClusterGroup ? handlers.handleContextMenu : undefined
          }
          contextMenuOpen={
            data.isClusterGroup ? state.contextMenuOpen : undefined
          }
          {...groupProps}
          {...rest}
        />
      </g>
      {/* Render drilldown menu using portal - only for cluster groups */}
      {data.isClusterGroup && (
        <ClusterContextMenu
          state={state}
          handlers={handlers}
          otherClusters={otherClusters}
          rootMenuId="cluster-menu-root"
        />
      )}
    </>
  );
};

export default observer(MCOStyleAppGroup);
