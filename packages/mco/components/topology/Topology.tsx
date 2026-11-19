import * as React from 'react';
import { getMajorVersion } from '@odf/mco/utils';
import HandleErrorAndLoading from '@odf/shared/error-handler/ErrorStateHandler';
import { useScheduler } from '@odf/shared/hooks';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { getName } from '@odf/shared/selectors';
import {
  BaseTopologyView,
  useSelectionHandler,
  useTopologyControls,
  useVisualizationSetup,
} from '@odf/shared/topology';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { EmptyState, EmptyStateBody, Title } from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import {
  GraphElement,
  useVisualizationController,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { ODFMCO_OPERATOR } from '../../constants';
import {
  getManagedClusterResourceObj,
  useStorageProviderInfo,
  useProtectedAppsByCluster,
  useDRPoliciesByClusterPair,
  useActiveDROperations,
} from '../../hooks';
import { ACMManagedClusterKind, Progression } from '../../types';
import { getManagedClusterInfoTypes } from '../../utils/managed-cluster-info';
import { TopologyDataContext } from './context/TopologyContext';
import { mcoLayoutFactory } from './factory/MCOLayoutFactory';
import { mcoTopologyComponentFactory } from './factory/MCOStyleFactory';
import TopologySideBar from './sidebar/TopologySideBar';
import TopologyToolbar from './TopologyToolbar';
import { TopologyViewLevel, FilterType } from './types';
import { generateClusterNodesModel } from './utils/node-generator';
import './topology.scss';

const TopologyViewComponent: React.FC = () => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [searchValue, setSearchValue] = React.useState('');
  const [selectedFilters, setSelectedFilters] = React.useState<FilterType[]>([
    FilterType.Cluster,
  ]);
  const controller = useVisualizationController();

  const [isSideBarOpen, setSideBarOpen] = React.useState(false);
  const {
    clusters,
    setSelectedElement,
    clusterAppsMap,
    clusterPairPoliciesMap,
    clusterPairOperationsMap,
  } = React.useContext(TopologyDataContext);

  const onCloseSideBar = React.useCallback(() => {
    setSideBarOpen(false);
    setSelectedIds([]);
  }, []);

  useSelectionHandler({
    controller,
    setSelectedElement,
    setSelectedIds,
    setSideBarOpen,
  });

  const prevStructureKeyRef = React.useRef<string>('');
  const prevSearchActiveRef = React.useRef(false);
  const prevSearchValueRef = React.useRef(searchValue);
  const prevSelectedFiltersRef = React.useRef(selectedFilters);
  // Stays true until graph.fit runs so a lagTick refresh that cancels the first
  // rAF can still schedule a fit when node IDs are unchanged.
  const pendingSearchFitRef = React.useRef(false);

  const memoizedClusters = useDeepCompareMemoize(clusters);
  const memoizedPolicies = useDeepCompareMemoize(clusterPairPoliciesMap);
  const memoizedOperations = useDeepCompareMemoize(clusterPairOperationsMap);
  const memoizedApps = useDeepCompareMemoize(clusterAppsMap);

  // Same lag tick as the DR status popover: Preparing → Awaiting resync without
  // waiting for a DRPC watch. Skip once every dry-run test is held.
  const [lagTick, setLagTick] = React.useState(0);
  const needsLagTick = React.useMemo(() => {
    if (!memoizedOperations) return false;
    return Object.values(memoizedOperations).some((ops) =>
      ops.some(
        (op) =>
          !!op.drpc?.spec?.dryRun &&
          op.progression !== Progression.TestingFailover
      )
    );
  }, [memoizedOperations]);
  const bumpLagTick = React.useCallback(() => {
    if (!needsLagTick) return;
    setLagTick((tick) => tick + 1);
  }, [needsLagTick]);
  useScheduler(bumpLagTick, needsLagTick ? undefined : null);

  const model = React.useMemo(() => {
    return generateClusterNodesModel(
      memoizedClusters,
      memoizedPolicies,
      memoizedOperations,
      memoizedApps,
      {
        searchValue,
        filterTypes: selectedFilters,
      }
    );
    // lagTick forces decorator recompute when sync age crosses the threshold.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    memoizedClusters,
    memoizedPolicies,
    memoizedOperations,
    memoizedApps,
    searchValue,
    selectedFilters,
    lagTick,
  ]);

  // Memoize structure key to avoid recreating arrays on every render
  const structureKey = React.useMemo(() => {
    return (model.nodes || [])
      .map((n) => n.id)
      .sort()
      .join(',');
  }, [model.nodes]);

  const isSearchActive = Boolean(searchValue.trim());

  // Initialize and update model when data changes
  React.useEffect(() => {
    if (!controller) return;

    const wasSearchActive = prevSearchActiveRef.current;
    const searchJustCleared = wasSearchActive && !isSearchActive;
    const searchJustActivated = !wasSearchActive && isSearchActive;
    const searchQueryChanged = prevSearchValueRef.current !== searchValue;
    const filtersChanged =
      prevSelectedFiltersRef.current.join(',') !== selectedFilters.join(',');
    prevSearchActiveRef.current = isSearchActive;
    prevSearchValueRef.current = searchValue;
    prevSelectedFiltersRef.current = selectedFilters;

    // Keep fit pending across lagTick refreshes that cancel rAF before the
    // first frame — clear only after the matching fit completes. Also refit
    // when the user edits the query or filters without changing node IDs.
    if (
      searchJustActivated ||
      searchJustCleared ||
      (isSearchActive && (searchQueryChanged || filtersChanged))
    ) {
      pendingSearchFitRef.current = true;
    }

    controller.fromModel(model, true);

    const graph = controller.getGraph();
    if (!graph) return;

    const structureChanged = structureKey !== prevStructureKeyRef.current;

    let cancelled = false;

    // Search mode: fit only when search turns on, structure changes, or a
    // previously queued activation fit was cancelled by a lagTick refresh.
    // lagTick-only refreshes after a successful fit must not reset pan/zoom.
    if (isSearchActive) {
      if (
        structureChanged ||
        searchJustActivated ||
        pendingSearchFitRef.current
      ) {
        requestAnimationFrame(() => {
          if (cancelled || !controller) return;
          graph.fit(100);
          pendingSearchFitRef.current = false;
          prevStructureKeyRef.current = structureKey;
        });
      }
      return () => {
        cancelled = true;
      };
    }

    if (searchJustCleared) {
      graph.reset();
    }

    // Mirror search-enter pending: if lagTick cancelled the clear-fit rAF,
    // keep layout/fit pending until normal-mode fit completes.
    const shouldLayout =
      structureChanged || searchJustCleared || pendingSearchFitRef.current;

    requestAnimationFrame(() => {
      if (cancelled || !controller) return;
      if (shouldLayout) {
        try {
          graph.layout();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console -- log layout failures for debugging
            console.warn('Topology layout failed:', error);
          }
        }
      }
      requestAnimationFrame(() => {
        if (cancelled || !controller) return;
        if (shouldLayout) {
          graph.fit(100);
          pendingSearchFitRef.current = false;
          prevStructureKeyRef.current = structureKey;
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    controller,
    model,
    structureKey,
    isSearchActive,
    searchValue,
    selectedFilters,
  ]);

  const controlButtons = useTopologyControls({ controller });

  const selectedElement = React.useContext(TopologyDataContext).selectedElement;
  const selectedElementId = selectedElement?.getId();
  const selectedElementData = React.useMemo(() => {
    if (!selectedElementId) return undefined;
    const node = model.nodes?.find((n) => n.id === selectedElementId);
    if (node) return node.data;
    const edge = model.edges?.find((e) => e.id === selectedElementId);
    return edge?.data;
  }, [selectedElementId, model]);

  React.useEffect(() => {
    if (selectedElementId && selectedElementData === undefined) {
      onCloseSideBar();
    }
  }, [selectedElementId, selectedElementData, onCloseSideBar]);

  const isEdgeSelected =
    selectedElementData?.policies !== undefined ||
    selectedElementData?.isOperation !== undefined;
  const isAppNodeSelected =
    (selectedElementData?.operation !== undefined &&
      selectedElementData?.isSource !== undefined) ||
    selectedElementData?.isStatic === true; // Also handle static apps
  const isFailoverNodeSelected = selectedElementData?.operations !== undefined;

  const sidebarResource =
    isEdgeSelected || isAppNodeSelected || isFailoverNodeSelected
      ? null
      : selectedElementData?.resource;
  const sidebarEdgeData =
    isEdgeSelected || isAppNodeSelected || isFailoverNodeSelected
      ? selectedElementData
      : undefined;

  return (
    <>
      <TopologyToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        selectedFilters={selectedFilters}
        onFilterChange={setSelectedFilters}
      />
      <div className="mco-topology__content">
        <BaseTopologyView
          controlButtons={controlButtons}
          sideBar={
            <TopologySideBar
              resource={sidebarResource}
              edgeData={sidebarEdgeData}
              onClose={onCloseSideBar}
              isExpanded={isSideBarOpen}
            />
          }
          sideBarOpen={isSideBarOpen}
          selectedIds={selectedIds}
        />
      </div>
    </>
  );
};

const TopologyEmptyState: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <EmptyState
      titleText={
        <Title headingLevel="h4" size="lg">
          {t('No clusters found')}
        </Title>
      }
      icon={TopologyIcon}
    >
      <EmptyStateBody>
        {t('Connect managed clusters to view the topology')}
      </EmptyStateBody>
    </EmptyState>
  );
};

const Topology: React.FC = () => {
  const controller = useVisualizationSetup({
    componentFactory: mcoTopologyComponentFactory,
    layoutFactory: mcoLayoutFactory,
  });
  const [selectedElement, setSelectedElement] =
    React.useState<GraphElement | null>(null);

  const [managedClusters, loaded, loadError] = useK8sWatchResource<
    ACMManagedClusterKind[]
  >(getManagedClusterResourceObj());

  const {
    odfClientInfoCM,
    scaleCM,
    loaded: providerInfoLoaded,
  } = useStorageProviderInfo();

  const [clusterAppsMap, appsLoaded, appsLoadError] =
    useProtectedAppsByCluster();

  const [clusterPairPoliciesMap, policiesLoaded, policiesLoadError] =
    useDRPoliciesByClusterPair();

  const [clusterPairOperationsMap, operationsLoaded, operationsLoadError] =
    useActiveDROperations();

  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

  const clustersWithODF = React.useMemo(() => {
    if (!loaded || !providerInfoLoaded || !odfMCOVersion || !csvLoaded) {
      return [];
    }

    const allClusters = getManagedClusterInfoTypes(
      managedClusters,
      odfClientInfoCM,
      scaleCM,
      odfMCOVersion,
      undefined
    );

    const validClusters = allClusters.filter(
      (cluster) => cluster?.odfInfo?.isValidODFVersion
    );

    return managedClusters.filter((cluster) =>
      validClusters.some((valid) => getName(valid) === getName(cluster))
    );
  }, [
    managedClusters,
    odfClientInfoCM,
    scaleCM,
    odfMCOVersion,
    loaded,
    providerInfoLoaded,
    csvLoaded,
  ]);

  const topologyDataContextData = React.useMemo(() => {
    return {
      clusters: clustersWithODF || [],
      selectedElement,
      setSelectedElement,
      visualizationLevel: TopologyViewLevel.CLUSTERS,
      odfMCOVersion,
      clusterAppsMap,
      clusterPairPoliciesMap,
      clusterPairOperationsMap,
    };
  }, [
    clustersWithODF,
    selectedElement,
    setSelectedElement,
    odfMCOVersion,
    clusterAppsMap,
    clusterPairPoliciesMap,
    clusterPairOperationsMap,
  ]);

  const allLoaded =
    loaded &&
    providerInfoLoaded &&
    csvLoaded &&
    appsLoaded &&
    policiesLoaded &&
    operationsLoaded;
  const hasNoClusters =
    allLoaded && (!clustersWithODF || clustersWithODF.length === 0);

  return (
    <TopologyDataContext.Provider value={topologyDataContextData}>
      <VisualizationProvider controller={controller}>
        <div className="mco-topology" id="mco-topology">
          {hasNoClusters ? (
            <TopologyEmptyState />
          ) : (
            <HandleErrorAndLoading
              loading={
                !loaded ||
                !providerInfoLoaded ||
                !appsLoaded ||
                !policiesLoaded ||
                !operationsLoaded ||
                !controller
              }
              error={(() => {
                const err =
                  loadError ||
                  appsLoadError ||
                  policiesLoadError ||
                  operationsLoadError ||
                  csvLoadError;
                return (err instanceof Error ? err.message : err) || '';
              })()}
            >
              <TopologyViewComponent />
            </HandleErrorAndLoading>
          )}
        </div>
      </VisualizationProvider>
    </TopologyDataContext.Provider>
  );
};

export default Topology;
