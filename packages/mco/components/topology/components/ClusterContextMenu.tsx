import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { createPortal } from 'react-dom';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  Divider,
  DrilldownMenu,
} from '@patternfly/react-core';
import { ACMManagedClusterKind } from '../../../types';
import {
  ClusterContextMenuState,
  ClusterContextMenuHandlers,
} from '../hooks/useClusterContextMenu';

export interface ClusterContextMenuProps {
  state: ClusterContextMenuState;
  handlers: ClusterContextMenuHandlers;
  otherClusters: ACMManagedClusterKind[];
  rootMenuId?: string;
}

/**
 * Reusable cluster context menu component
 * Used by MCOStyleNode and MCOStyleAppGroup
 */
export const ClusterContextMenu: React.FC<ClusterContextMenuProps> = ({
  state,
  handlers,
  otherClusters,
  rootMenuId = 'cluster-menu-root',
}) => {
  const { t } = useCustomTranslation();
  const {
    contextMenuOpen,
    menuPosition,
    menuDrilledIn,
    drilldownPath,
    menuHeights,
    activeMenu,
    menuRef,
  } = state;
  const {
    drillIn,
    drillOut,
    setHeight,
    handlePairWithCluster,
    handleViewDetails,
  } = handlers;

  if (!contextMenuOpen) {
    return null;
  }

  const contextMenu = (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: menuPosition.x,
        top: menuPosition.y,
        zIndex: 9999,
      }}
    >
      <Menu
        id={rootMenuId}
        containsDrilldown
        drilldownItemPath={drilldownPath}
        drilledInMenus={menuDrilledIn}
        activeMenu={activeMenu}
        onDrillIn={drillIn}
        onDrillOut={drillOut}
        onGetMenuHeight={setHeight}
      >
        <MenuContent menuHeight={`${menuHeights[activeMenu]}px`}>
          <MenuList>
            <MenuItem
              itemId="group:pair_cluster"
              direction="down"
              drilldownMenu={
                <DrilldownMenu id={`${rootMenuId}-pair`}>
                  <MenuItem
                    itemId="group:pair_cluster_breadcrumb"
                    direction="up"
                  >
                    {t('Pair cluster')}
                  </MenuItem>
                  <Divider component="li" />
                  {otherClusters.length > 0 ? (
                    otherClusters.map((cluster) => {
                      const clusterName = getName(cluster);
                      return (
                        <MenuItem
                          key={clusterName}
                          itemId={`cluster:${clusterName}`}
                          onClick={() => handlePairWithCluster(clusterName)}
                        >
                          {clusterName}
                        </MenuItem>
                      );
                    })
                  ) : (
                    <MenuItem itemId="no-clusters" isDisabled>
                      {t('No other clusters available')}
                    </MenuItem>
                  )}
                </DrilldownMenu>
              }
            >
              {t('Pair cluster')}
            </MenuItem>
            <MenuItem itemId="group:view_details" onClick={handleViewDetails}>
              {t('View details')}
            </MenuItem>
          </MenuList>
        </MenuContent>
      </Menu>
    </div>
  );

  return createPortal(contextMenu, document.body);
};
