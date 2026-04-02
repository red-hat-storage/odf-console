import * as React from 'react';
import { DRPolicyModel } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import classNames from 'classnames';
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
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InProgressIcon,
} from '@patternfly/react-icons';
import {
  DefaultGroup,
  Node,
  observer,
  WithContextMenuProps,
  WithDragNodeProps,
  WithSelectionProps,
  Decorator,
  DEFAULT_DECORATOR_RADIUS,
  getDefaultShapeDecoratorCenter,
} from '@patternfly/react-topology';
import { DR_BASE_ROUTE } from '../../../constants';
import { TopologyDataContext } from '../context/TopologyContext';
import './MCOStyleAppGroup.scss';

type MCOStyleAppGroupProps = {
  element: Node;
} & Partial<WithContextMenuProps & WithDragNodeProps & WithSelectionProps>;

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

const MCOStyleAppGroup: React.FunctionComponent<MCOStyleAppGroupProps> = ({
  element,
  ...rest
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { clusters } = React.useContext(TopologyDataContext);
  const data = element.getData();
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [menuDrilledIn, setMenuDrilledIn] = React.useState<string[]>([]);
  const [drilldownPath, setDrilldownPath] = React.useState<string[]>([]);
  const [menuHeights, setMenuHeights] = React.useState<any>({});
  const [activeMenu, setActiveMenu] =
    React.useState<string>('cluster-menu-root');

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

  // Get current cluster name
  const currentClusterName = data.isClusterGroup ? getName(data.resource) : '';

  // Get other clusters that can be paired with
  const otherClusters = clusters.filter(
    (cluster) => getName(cluster) !== currentClusterName
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
    (menuId: string, height: number) => {
      if (
        menuHeights[menuId] === undefined ||
        (menuId !== 'cluster-menu-root' && menuHeights[menuId] !== height)
      ) {
        setMenuHeights({ ...menuHeights, [menuId]: height });
      }
    },
    [menuHeights]
  );

  const handlePairWithCluster = React.useCallback(
    (targetClusterName: string) => {
      const drPolicyNewRoute = `${DR_BASE_ROUTE}/policies/${referenceForModel(
        DRPolicyModel
      )}/~new?cluster1=${encodeURIComponent(currentClusterName)}&cluster2=${encodeURIComponent(targetClusterName)}`;
      navigate(drPolicyNewRoute);
      setContextMenuOpen(false);
      // Reset drill state
      setMenuDrilledIn([]);
      setDrilldownPath([]);
      setActiveMenu('cluster-menu-root');
    },
    [navigate, currentClusterName]
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
          setActiveMenu('cluster-menu-root');
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
        id="cluster-menu-root"
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
                <DrilldownMenu id="cluster-menu-pair">
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
          </MenuList>
        </MenuContent>
      </Menu>
    </div>
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
          onContextMenu={handleContextMenu}
          contextMenuOpen={contextMenuOpen}
          {...groupProps}
          {...rest}
        />
        {/* Manually render decorators for groups */}
        {renderDecorators(element, data)}
      </g>
      {/* Render drilldown menu using portal */}
      {contextMenu && createPortal(contextMenu, document.body)}
    </>
  );
};

export default observer(MCOStyleAppGroup);
