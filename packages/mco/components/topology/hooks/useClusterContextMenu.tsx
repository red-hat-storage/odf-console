import * as React from 'react';
import { DRPolicyModel } from '@odf/shared';
import { referenceForModel } from '@odf/shared/utils';
import { useNavigate } from 'react-router-dom-v5-compat';
import { DR_BASE_ROUTE, CLUSTER_DETAILS_ROUTE } from '../../../constants';

export interface ClusterContextMenuState {
  contextMenuOpen: boolean;
  menuPosition: { x: number; y: number };
  menuDrilledIn: string[];
  drilldownPath: string[];
  menuHeights: Record<string, number>;
  activeMenu: string;
  menuRef: React.RefObject<HTMLDivElement>;
}

export interface ClusterContextMenuHandlers {
  setContextMenuOpen: (open: boolean) => void;
  handleContextMenu: (e: React.MouseEvent) => void;
  drillIn: (
    event: React.KeyboardEvent | React.MouseEvent,
    fromMenuId: string,
    toMenuId: string,
    pathId: string
  ) => void;
  drillOut: (
    event: React.KeyboardEvent | React.MouseEvent,
    toMenuId: string
  ) => void;
  setHeight: (menuId: string, height: number) => void;
  handlePairWithCluster: (targetClusterName: string) => void;
  handleViewDetails: () => void;
  resetMenuState: () => void;
}

export interface UseClusterContextMenuOptions {
  onPairCluster?: (sourceCluster: string, targetCluster: string) => void;
  onViewDetails?: (clusterName: string) => void;
}

export interface UseClusterContextMenuResult {
  state: ClusterContextMenuState;
  handlers: ClusterContextMenuHandlers;
}

export const useClusterContextMenu = (
  clusterName: string,
  rootMenuId: string = 'cluster-menu-root',
  options: UseClusterContextMenuOptions = {}
): UseClusterContextMenuResult => {
  const navigate = useNavigate();
  const { onPairCluster, onViewDetails } = options;
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ x: 0, y: 0 });
  const [menuDrilledIn, setMenuDrilledIn] = React.useState<string[]>([]);
  const [drilldownPath, setDrilldownPath] = React.useState<string[]>([]);
  const [menuHeights, setMenuHeights] = React.useState<Record<string, number>>(
    {}
  );
  const [activeMenu, setActiveMenu] = React.useState<string>(rootMenuId);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const resetMenuState = React.useCallback(() => {
    setMenuDrilledIn([]);
    setDrilldownPath([]);
    setActiveMenu(rootMenuId);
  }, [rootMenuId]);

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
        (menuId !== rootMenuId && menuHeights[menuId] !== height)
      ) {
        setMenuHeights({ ...menuHeights, [menuId]: height });
      }
    },
    [menuHeights, rootMenuId]
  );

  const handlePairWithCluster = React.useCallback(
    (targetClusterName: string) => {
      if (onPairCluster) {
        // Use custom callback (e.g., open modal)
        onPairCluster(clusterName, targetClusterName);
      } else {
        // Default: navigate to create policy page
        const drPolicyNewRoute = `${DR_BASE_ROUTE}/policies/${referenceForModel(
          DRPolicyModel
        )}/~new?cluster1=${encodeURIComponent(clusterName)}&cluster2=${encodeURIComponent(targetClusterName)}`;
        navigate(drPolicyNewRoute);
      }
      setContextMenuOpen(false);
      resetMenuState();
    },
    [navigate, clusterName, resetMenuState, onPairCluster]
  );

  const handleViewDetails = React.useCallback(() => {
    if (onViewDetails) {
      // Use custom callback
      onViewDetails(clusterName);
    } else {
      // Default: navigate to cluster details
      navigate(`${CLUSTER_DETAILS_ROUTE}/${clusterName}/${clusterName}`);
    }
    setContextMenuOpen(false);
    resetMenuState();
  }, [navigate, clusterName, resetMenuState, onViewDetails]);

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
        const isInside = menuRef.current.contains(target as any);

        if (!isInside) {
          setContextMenuOpen(false);
          resetMenuState();
        }
      }
    };

    // Small delay to avoid closing on the same click that opened it
    // Increased from 10ms to 100ms to prevent race conditions
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickAnywhere, true);
      document.addEventListener('contextmenu', handleClickAnywhere, true);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickAnywhere, true);
      document.removeEventListener('contextmenu', handleClickAnywhere, true);
    };
  }, [contextMenuOpen, resetMenuState]);

  return {
    state: {
      contextMenuOpen,
      menuPosition,
      menuDrilledIn,
      drilldownPath,
      menuHeights,
      activeMenu,
      menuRef,
    },
    handlers: {
      setContextMenuOpen,
      handleContextMenu,
      drillIn,
      drillOut,
      setHeight,
      handlePairWithCluster,
      handleViewDetails,
      resetMenuState,
    },
  };
};
