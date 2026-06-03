import * as React from 'react';
import { getMajorVersion } from '@odf/mco/utils';
import { ACMManagedClusterViewModel } from '@odf/shared';
import HandleErrorAndLoading from '@odf/shared/error-handler/ErrorStateHandler';
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
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { EmptyState, EmptyStateBody, Title } from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import {
  GraphElement,
  useVisualizationController,
  VisualizationProvider,
} from '@patternfly/react-topology';
import {
  MCO_CREATED_BY_LABEL_KEY,
  MCO_CREATED_BY_MC_CONTROLLER,
  ODFMCO_OPERATOR,
} from '../../constants';
import {
  getManagedClusterResourceObj,
  useProtectedAppsByCluster,
  useDRPoliciesByClusterPair,
  useActiveDROperations,
} from '../../hooks';
import { ACMManagedClusterKind, ACMManagedClusterViewKind } from '../../types';
import { CreateDRPolicyModal } from '../create-dr-policy/CreateDRPolicyModal';
import { getManagedClusterInfoTypes } from '../create-dr-policy/utils/cluster-list-utils';
import { TopologyDataContext } from './context/TopologyContext';
import { mcoTopologyComponentFactory } from './factory/MCOStyleFactory';
import TopologySideBar from './sidebar/TopologySideBar';
import TopologyToolbar from './TopologyToolbar';
import { TopologyViewLevel, FilterType } from './types';
import { generateClusterNodesModel } from './utils/node-generator';
import './topology.scss';

const TopologyViewComponent: React.FC = () => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [searchValue, setSearchValue] = React.useState('');
  const [selectedFilters, setSelectedFilters] = React.useState<FilterType[]>(
    []
  );
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

  const memoizedClusters = useDeepCompareMemoize(clusters);
  const memoizedPolicies = useDeepCompareMemoize(clusterPairPoliciesMap);
  const memoizedOperations = useDeepCompareMemoize(clusterPairOperationsMap);
  const memoizedApps = useDeepCompareMemoize(clusterAppsMap);

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
  }, [
    memoizedClusters,
    memoizedPolicies,
    memoizedOperations,
    memoizedApps,
    searchValue,
    selectedFilters,
  ]);

  // Memoize structure key to avoid recreating arrays on every render
  const structureKey = React.useMemo(() => {
    return (model.nodes || [])
      .map((n) => n.id)
      .sort()
      .join(',');
  }, [model.nodes]);

  // Initialize and update model when data changes
  React.useEffect(() => {
    if (!controller) return;

    controller.fromModel(model);

    if (structureKey !== prevStructureKeyRef.current) {
      prevStructureKeyRef.current = structureKey;
      const graph = controller.getGraph();
      if (!graph) return;

      // Delay fit until after the layout engine finishes positioning nodes
      requestAnimationFrame(() => {
        // Check if controller still exists (component may have unmounted)
        if (!controller) return;
        graph.layout();
        requestAnimationFrame(() => {
          // Check again before calling fit (double RAF delay)
          if (!controller) return;
          graph.fit(100);
        });
      });
    }
  }, [controller, model, structureKey]);

  const controlButtons = useTopologyControls({ controller });

  // Derive sidebar data from the reactive model instead of selectedElement.getData().
  // getData() reads from the GraphElement which is updated by fromModel() in an
  // effect — one render behind. The model is computed from context maps and is current.
  // When the element no longer exists in the model (e.g. operation completed),
  // return undefined so the sidebar closes rather than showing stale data.
  const selectedElement = React.useContext(TopologyDataContext).selectedElement;
  const selectedElementId = selectedElement?.getId();
  const selectedElementData = React.useMemo(() => {
    if (!selectedElementId) return undefined;
    const node = model.nodes?.find((n) => n.id === selectedElementId);
    if (node) return node.data;
    const edge = model.edges?.find((e) => e.id === selectedElementId);
    return edge?.data;
  }, [selectedElementId, model]);

  // Close sidebar when the selected element disappears from the model
  React.useEffect(() => {
    if (selectedElementId && selectedElementData === undefined) {
      onCloseSideBar();
    }
  }, [selectedElementId, selectedElementData, onCloseSideBar]);

  // Check what type of element is selected
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
  });
  const [selectedElement, setSelectedElement] =
    React.useState<GraphElement | null>(null);

  // Modal state for cluster pairing
  const [isPairModalOpen, setIsPairModalOpen] = React.useState(false);
  const [pairModalClusters, setPairModalClusters] = React.useState<string[]>(
    []
  );

  const [managedClusters, loaded, loadError] = useK8sWatchResource<
    ACMManagedClusterKind[]
  >(getManagedClusterResourceObj());

  const [mcvs, mcvsLoaded, mcvsLoadError] = useK8sWatchResource<
    ACMManagedClusterViewKind[]
  >({
    kind: referenceForModel(ACMManagedClusterViewModel),
    selector: {
      matchLabels: { [MCO_CREATED_BY_LABEL_KEY]: MCO_CREATED_BY_MC_CONTROLLER },
    },
    isList: true,
  });

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

  // Filter clusters to only include those with valid ODF installed
  const clustersWithODF = React.useMemo(() => {
    if (!loaded || !mcvsLoaded || !odfMCOVersion || !csvLoaded) {
      return [];
    }

    const allClusters = getManagedClusterInfoTypes(
      managedClusters,
      mcvs,
      odfMCOVersion,
      undefined // We don't need provisioners for this filtering
    );

    // Filter to only include clusters with valid ODF version
    const validClusters = allClusters.filter(
      (cluster) => cluster?.odfInfo?.isValidODFVersion
    );

    // Return the original ACMManagedClusterKind objects
    return managedClusters.filter((cluster) =>
      validClusters.some((valid) => getName(valid) === getName(cluster))
    );
  }, [managedClusters, mcvs, odfMCOVersion, loaded, mcvsLoaded, csvLoaded]);

  const handleOpenPairModal = React.useCallback(
    (sourceCluster: string, targetCluster: string) => {
      setPairModalClusters([sourceCluster, targetCluster]);
      setIsPairModalOpen(true);
    },
    []
  );

  const handleClosePairModal = React.useCallback(() => {
    setIsPairModalOpen(false);
    setPairModalClusters([]);
  }, []);

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
      onOpenPairModal: handleOpenPairModal,
    };
  }, [
    clustersWithODF,
    selectedElement,
    setSelectedElement,
    odfMCOVersion,
    clusterAppsMap,
    clusterPairPoliciesMap,
    clusterPairOperationsMap,
    handleOpenPairModal,
  ]);

  const hasNoClusters =
    loaded && mcvsLoaded && (!clustersWithODF || clustersWithODF.length === 0);

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
                !mcvsLoaded ||
                !appsLoaded ||
                !policiesLoaded ||
                !operationsLoaded ||
                !controller
              }
              error={(() => {
                const err =
                  loadError ||
                  mcvsLoadError ||
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
        <CreateDRPolicyModal
          isOpen={isPairModalOpen}
          onClose={handleClosePairModal}
          preSelectedClusters={pairModalClusters}
        />
      </VisualizationProvider>
    </TopologyDataContext.Provider>
  );
};

export default Topology;
