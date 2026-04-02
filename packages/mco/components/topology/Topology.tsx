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
import { TopologyDataContext } from './context/TopologyContext';
import { mcoTopologyComponentFactory } from './factory/MCOStyleFactory';
import TopologySideBar from './sidebar/TopologySideBar';
import { TopologyViewLevel } from './types';
import { generateClusterNodesModel } from './utils/node-generator';
import './topology.scss';

const TopologyErrorMessage: React.FC<{ error: any }> = ({ error }) => (
  <>{error}</>
);

const TopologyViewComponent: React.FC = () => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
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
      clusterAppsMap
    );
    controller.fromModel(model);
  }, [
    controller,
    clusters,
    clusterPairPoliciesMap,
    clusterPairOperationsMap,
    clusterAppsMap,
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
  );
};

const Topology: React.FC = () => {
  const controller = useVisualizationSetup({
    componentFactory: mcoTopologyComponentFactory as any,
  });
  const [selectedElement, setSelectedElement] =
    React.useState<GraphElement>(null);

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

  const topologyDataContextData = React.useMemo(() => {
    return {
      clusters: managedClusters || [],
      selectedElement,
      setSelectedElement: setSelectedElement as any,
      visualizationLevel: TopologyViewLevel.CLUSTERS,
      odfMCOVersion,
      clusterAppsMap,
      clusterPairPoliciesMap,
      clusterPairOperationsMap,
    };
  }, [
    managedClusters,
    selectedElement,
    setSelectedElement,
    odfMCOVersion,
    clusterAppsMap,
    clusterPairPoliciesMap,
    clusterPairOperationsMap,
  ]);

  return (
    <TopologyDataContext.Provider value={topologyDataContextData}>
      <VisualizationProvider controller={controller}>
        <div className="mco-topology" id="mco-topology">
          <HandleErrorAndLoading
            loading={
              !loaded ||
              !appsLoaded ||
              !policiesLoaded ||
              !operationsLoaded ||
              !controller
            }
            error={
              (loadError instanceof Error ? loadError.message : loadError) ||
              (appsLoadError instanceof Error
                ? appsLoadError.message
                : appsLoadError) ||
              (policiesLoadError instanceof Error
                ? policiesLoadError.message
                : policiesLoadError) ||
              (operationsLoadError instanceof Error
                ? operationsLoadError.message
                : operationsLoadError) ||
              ''
            }
            ErrorMessage={TopologyErrorMessage}
          >
            <TopologyViewComponent />
          </HandleErrorAndLoading>
        </div>
      </VisualizationProvider>
    </TopologyDataContext.Provider>
  );
};

const TopologyViewErrorMessage: React.FC = () => {
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

const TopologyWithErrorHandler: React.FC = () => {
  const [managedClusters, loaded] = useK8sWatchResource<
    ACMManagedClusterKind[]
  >(getManagedClusterResourceObj());

  const showTopology = loaded && managedClusters?.length > 0;

  return showTopology ? <Topology /> : <TopologyViewErrorMessage />;
};

export default TopologyWithErrorHandler;
