import * as React from 'react';
import { getMajorVersion } from '@odf/mco/utils';
import HandleErrorAndLoading from '@odf/shared/error-handler/ErrorStateHandler';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
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
  useProtectedAppsByCluster,
  useDRPoliciesByClusterPair,
  useActiveDROperations,
} from '../../hooks';
import { ACMManagedClusterKind } from '../../types';
import { CreateDRPolicyModal } from '../create-dr-policy/CreateDRPolicyModal';
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

  // Initialize and update model when data changes
  React.useEffect(() => {
    if (!controller) return;

    const model = generateClusterNodesModel(
      clusters,
      clusterPairPoliciesMap,
      clusterPairOperationsMap,
      clusterAppsMap,
      {
        searchValue,
        filterTypes: selectedFilters,
      }
    );
    controller.fromModel(model);
  }, [
    controller,
    clusters,
    clusterPairPoliciesMap,
    clusterPairOperationsMap,
    clusterAppsMap,
    searchValue,
    selectedFilters,
  ]);

  const controlButtons = useTopologyControls({ controller });

  // Get the selected element's data
  const selectedElement = React.useContext(TopologyDataContext).selectedElement;
  const selectedElementData = selectedElement?.getData();

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

  const [clusterAppsMap, appsLoaded, appsLoadError] =
    useProtectedAppsByCluster();

  const [clusterPairPoliciesMap, policiesLoaded, policiesLoadError] =
    useDRPoliciesByClusterPair();

  const [clusterPairOperationsMap, operationsLoaded, operationsLoadError] =
    useActiveDROperations();

  const [csv] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

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
      clusters: managedClusters || [],
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
    managedClusters,
    selectedElement,
    setSelectedElement,
    odfMCOVersion,
    clusterAppsMap,
    clusterPairPoliciesMap,
    clusterPairOperationsMap,
    handleOpenPairModal,
  ]);

  const hasNoClusters =
    loaded && (!managedClusters || managedClusters.length === 0);

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
                  operationsLoadError;
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
