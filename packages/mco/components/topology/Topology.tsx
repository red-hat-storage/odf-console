import * as React from 'react';
import { getMajorVersion } from '@odf/mco/utils';
import HandleErrorAndLoading from '@odf/shared/error-handler/ErrorStateHandler';
import { useFetchCsv } from '@odf/shared/hooks/use-fetch-csv';
import { getUID } from '@odf/shared/selectors';
import { defaultLayoutFactory } from '@odf/shared/topology';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { TopologyIcon } from '@patternfly/react-icons';
import {
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  GraphElement,
  TopologyControlBar,
  TopologyView,
  useVisualizationController,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  SELECTION_EVENT,
} from '@patternfly/react-topology';
import { ODFMCO_OPERATOR } from '../../constants';
import { getManagedClusterResourceObj } from '../../hooks';
import { ACMManagedClusterKind } from '../../types';
import { TopologyDataContext } from './context/TopologyContext';
import { mcoTopologyComponentFactory } from './factory/MCOStyleFactory';
import TopologySideBar from './sidebar/TopologySideBar';
import { TopologyViewLevel } from './types';
import { generateClusterNodesModel } from './utils/node-generator';
import './topology.scss';

const ZOOM_IN = 4 / 3;
const ZOOM_OUT = 3 / 4;

type SideBarProps = {
  onClose: () => void;
  isExpanded: boolean;
};

const Sidebar: React.FC<SideBarProps> = ({ onClose, isExpanded }) => {
  const { selectedElement } = React.useContext(TopologyDataContext);
  const data = selectedElement?.getData();
  const resource = data?.resource;

  return (
    <TopologySideBar
      resource={resource}
      onClose={onClose}
      isExpanded={isExpanded}
    />
  );
};

const TopologyViewComponent: React.FC = () => {
  const { t } = useCustomTranslation();
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const controller = useVisualizationController();

  const [isSideBarOpen, setSideBarOpen] = React.useState(false);
  const { clusters, setSelectedElement } =
    React.useContext(TopologyDataContext);

  const onCloseSideBar = React.useCallback(() => {
    setSideBarOpen(false);
    setSelectedIds([]);
  }, []);

  React.useEffect(() => {
    const selectionHandler = (ids: string[]) => {
      const element = controller.getElementById(ids[0]);
      if (element) {
        setSelectedElement(element);
        setSelectedIds([ids[0]]);
        setSideBarOpen(true);
      }
    };
    controller.addEventListener(SELECTION_EVENT, selectionHandler);
    return () => {
      controller.removeEventListener(SELECTION_EVENT, selectionHandler);
    };
  }, [controller, setSelectedElement]);

  React.useEffect(() => {
    const model = generateClusterNodesModel(clusters);
    controller.fromModel(model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const currentModel = controller.toModel();
    const graphNodes = currentModel.nodes || [];

    const existingIDs = new Set(graphNodes.map((node) => node.id));
    const inViewUIDs = new Set(clusters.map(getUID));

    // Check if update is needed
    const needsUpdate =
      existingIDs.size !== inViewUIDs.size ||
      Array.from(inViewUIDs).some((uid) => !existingIDs.has(uid));

    if (needsUpdate) {
      const model = generateClusterNodesModel(clusters);
      controller.fromModel(model, false);
    }
  }, [controller, clusters]);

  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          data-test="topology-control-bar"
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInTip: t('Zoom in'),
            zoomInCallback: () => {
              controller && controller.getGraph().scaleBy(ZOOM_IN);
            },
            zoomOutTip: t('Zoom out'),
            zoomOutCallback: () => {
              controller && controller.getGraph().scaleBy(ZOOM_OUT);
            },
            fitToScreenTip: t('Fit to screen'),
            fitToScreenCallback: () => {
              controller && controller.getGraph().fit(100);
            },
            resetViewTip: t('Reset view'),
            resetViewCallback: () => {
              if (controller) {
                controller.getGraph().reset();
                controller.getGraph().layout();
              }
            },
            legend: false,
          })}
        />
      }
      sideBar={<Sidebar onClose={onCloseSideBar} isExpanded={isSideBarOpen} />}
      sideBarResizable={true}
      minSideBarSize="400px"
      sideBarOpen={isSideBarOpen}
    >
      <VisualizationSurface state={{ selectedIds }} />
    </TopologyView>
  );
};

const Error: React.FC<{ error: any }> = ({ error }) => <>{error}</>;

const Topology: React.FC = () => {
  const [controller, setController] = React.useState<Visualization>(null);
  const [selectedElement, setSelectedElement] =
    React.useState<GraphElement>(null);

  const [managedClusters, loaded, loadError] = useK8sWatchResource<
    ACMManagedClusterKind[]
  >(getManagedClusterResourceObj());

  const [csv] = useFetchCsv({
    specName: ODFMCO_OPERATOR,
  });
  const odfMCOVersion = getMajorVersion(csv?.spec?.version);

  React.useEffect(() => {
    const temp = new Visualization();
    temp.registerLayoutFactory(defaultLayoutFactory);
    temp.registerComponentFactory(mcoTopologyComponentFactory as any);
    setController(temp);
  }, []);

  const topologyDataContextData = React.useMemo(() => {
    return {
      clusters: managedClusters || [],
      selectedElement,
      setSelectedElement: setSelectedElement as any,
      visualizationLevel: TopologyViewLevel.CLUSTERS,
      odfMCOVersion,
    };
  }, [managedClusters, selectedElement, setSelectedElement, odfMCOVersion]);

  return (
    <TopologyDataContext.Provider value={topologyDataContextData}>
      <VisualizationProvider controller={controller}>
        <div className="mco-topology" id="mco-topology">
          <HandleErrorAndLoading
            loading={!loaded}
            error={loadError}
            ErrorMessage={Error}
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
    <EmptyState>
      <EmptyStateIcon icon={TopologyIcon} />
      <Title headingLevel="h4" size="lg">
        {t('No clusters found')}
      </Title>
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
