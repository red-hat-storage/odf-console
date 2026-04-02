import * as React from 'react';
import { DRPolicyModel } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  Divider,
  DrilldownMenu,
  Tooltip,
} from '@patternfly/react-core';
import {
  ClusterIcon,
  CubeIcon,
  LayerGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import {
  DefaultNode,
  Node,
  observer,
  ScaleDetailsLevel,
  WithSelectionProps,
  Decorator,
  DEFAULT_DECORATOR_RADIUS,
  getDefaultShapeDecoratorCenter,
} from '@patternfly/react-topology';
import { CLUSTER_DETAILS_ROUTE, DR_BASE_ROUTE } from '../../../constants';
import { TopologyDataContext } from '../context/TopologyContext';
import './MCOStyleNode.scss';

type MCOStyleNodeProps = {
  element: Node;
} & Partial<WithSelectionProps & { hover?: boolean }>;

export const ICON_SIZE = 60;

const getDecoratorIcon = (icon: string): React.ReactNode => {
  switch (icon) {
    case 'check-circle':
      return (
        <CheckCircleIcon
          style={{ fill: 'var(--pf-v6-global--success-color--100)' }}
        />
      );
    case 'exclamation-circle':
      return (
        <ExclamationCircleIcon
          style={{ fill: 'var(--pf-v6-global--danger-color--100)' }}
        />
      );
    case 'exclamation-triangle':
      return (
        <ExclamationTriangleIcon
          style={{ fill: 'var(--pf-v6-global--warning-color--100)' }}
        />
      );
    case 'in-progress':
      return (
        <InProgressIcon
          style={{ fill: 'var(--pf-v6-global--info-color--100)' }}
        />
      );
    default:
      return null;
  }
};

const renderDecorators = (element: Node, data: any): React.ReactNode => {
  const decorators = data.decorators;
  if (!decorators || !Array.isArray(decorators) || decorators.length === 0) {
    return null;
  }

  return (
    <>
      {decorators.map((decorator: any, index: number) => {
        const { quadrant, icon, tooltip } = decorator;
        const { x, y } = getDefaultShapeDecoratorCenter(quadrant, element);
        const decoratorRef = React.createRef<SVGGElement>();

        const decoratorIcon = icon ? getDecoratorIcon(icon) : null;

        return (
          <React.Fragment key={`decorator-${index}`}>
            <Tooltip content={tooltip} triggerRef={decoratorRef} />
            <Decorator
              innerRef={decoratorRef}
              x={x}
              y={y}
              radius={DEFAULT_DECORATOR_RADIUS}
              showBackground
              icon={decoratorIcon}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

const MCOStyleNodeComponent: React.FC<MCOStyleNodeProps> = ({
  element,
  ...rest
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { clusterAppsMap, clusterPairOperationsMap, clusters } =
    React.useContext(TopologyDataContext);
  const data = element.getData();
  const detailsLevel = useDetailsLevel();
  const { width, height } = element.getDimensions();
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [menuDrilledIn, setMenuDrilledIn] = React.useState<string[]>([]);
  const [drilldownPath, setDrilldownPath] = React.useState<string[]>([]);
  const [menuHeights, setMenuHeights] = React.useState<any>({});
  const [activeMenu, setActiveMenu] = React.useState<string>(
    'cluster-node-menu-root'
  );

  // DefaultNode handles hover internally, we get it from rest props
  const showLabel = rest.hover || detailsLevel !== ScaleDetailsLevel.low;

  // Get cluster name and check for protected apps
  const clusterName = getName(data.resource);
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

  const drillIn = React.useCallback(
    (
      _event: React.KeyboardEvent | React.MouseEvent,
      fromMenuId: string,
      toMenuId: string,
      pathId: string
    ) => {
      setMenuDrilledIn([...menuDrilledIn, fromMenuId]);
      setDrilldownPath([...drilldownPath, pathId]);
      setActiveMenu(toMenuId);
    },
    [menuDrilledIn, drilldownPath]
  );

  const drillOut = React.useCallback(
    (_event: React.KeyboardEvent | React.MouseEvent, toMenuId: string) => {
      const menuDrilledInSansLast = menuDrilledIn.slice(
        0,
        menuDrilledIn.length - 1
      );
      const pathSansLast = drilldownPath.slice(0, drilldownPath.length - 1);
      setMenuDrilledIn(menuDrilledInSansLast);
      setDrilldownPath(pathSansLast);
      setActiveMenu(toMenuId);
    },
    [menuDrilledIn, drilldownPath]
  );

  const setHeight = React.useCallback(
    (menuId: string, menuHeight: number) => {
      if (
        menuHeights[menuId] === undefined ||
        (menuId !== 'cluster-node-menu-root' &&
          menuHeights[menuId] !== menuHeight)
      ) {
        setMenuHeights({ ...menuHeights, [menuId]: menuHeight });
      }
    },
    [menuHeights]
  );

  const handlePairWithCluster = React.useCallback(
    (targetClusterName: string) => {
      const drPolicyNewRoute = `${DR_BASE_ROUTE}/policies/${referenceForModel(
        DRPolicyModel
      )}/~new?cluster1=${encodeURIComponent(clusterName)}&cluster2=${encodeURIComponent(targetClusterName)}`;
      navigate(drPolicyNewRoute);
      setContextMenuOpen(false);
      // Reset drill state
      setMenuDrilledIn([]);
      setDrilldownPath([]);
      setActiveMenu('cluster-node-menu-root');
    },
    [navigate, clusterName]
  );

  const menuRef = React.useRef<HTMLDivElement>(null);

  const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  }, []);

  // Close menu when clicking anywhere outside
  React.useEffect(() => {
    if (!contextMenuOpen) return;

    const handleClickAnywhere = (event: Event) => {
      const target = event.target as EventTarget | null;

      if (menuRef.current && target) {
        // Use contains which accepts EventTarget
        const isInside = menuRef.current.contains(target as any);

        if (!isInside) {
          setContextMenuOpen(false);
          setMenuDrilledIn([]);
          setDrilldownPath([]);
          setActiveMenu('cluster-node-menu-root');
        }
      }
    };

    // Small delay to avoid closing on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickAnywhere, true);
      document.addEventListener('contextmenu', handleClickAnywhere, true);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickAnywhere, true);
      document.removeEventListener('contextmenu', handleClickAnywhere, true);
    };
  }, [contextMenuOpen]);

  const contextMenu = contextMenuOpen && (
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
        id="cluster-node-menu-root"
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
                <DrilldownMenu id="cluster-node-menu-pair">
                  <MenuItem
                    itemId="group:pair_cluster_breadcrumb"
                    direction="up"
                  >
                    {t('Pair cluster')}
                  </MenuItem>
                  <Divider component="li" />
                  {otherClusters.length > 0 ? (
                    otherClusters.map((cluster) => {
                      const targetCluster = getName(cluster);
                      return (
                        <MenuItem
                          key={targetCluster}
                          itemId={`cluster:${targetCluster}`}
                          onClick={() => handlePairWithCluster(targetCluster)}
                        >
                          {targetCluster}
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
            <MenuItem
              itemId="group:view_details"
              onClick={() =>
                navigate(
                  `${CLUSTER_DETAILS_ROUTE}/${clusterName}/${clusterName}`
                )
              }
            >
              {t('View details')}
            </MenuItem>
          </MenuList>
        </MenuContent>
      </Menu>
    </div>
  );

  // Determine which icon to show
  const IconComponent =
    appCount === 0 ? ClusterIcon : appCount === 1 ? CubeIcon : LayerGroupIcon;

  return (
    <g>
      <DefaultNode
        element={element}
        scaleLabel={false}
        showLabel={showLabel}
        onContextMenu={handleContextMenu}
        contextMenuOpen={contextMenuOpen}
        attachments={renderDecorators(element, data)}
        {...rest}
        {...data}
        showStatusDecorator={false} // Disable built-in decorator, we use attachments (must be after spreads)
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
            <circle r="12" fill="#06c" />
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              {appCount}
            </text>
          </g>
        )}
      </DefaultNode>
      {/* Render drilldown menu using portal */}
      {contextMenu && createPortal(contextMenu, document.body)}
    </g>
  );
};

export const MCOStyleNode = observer(MCOStyleNodeComponent);
