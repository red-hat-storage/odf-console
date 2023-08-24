import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import HandleErrorAndLoading from '@odf/shared/error-handler/ErrorStateHandler';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import {
  ClusterServiceVersionModel,
  DeploymentModel,
  NodeModel,
} from '@odf/shared/models';
import { getName, getUID } from '@odf/shared/selectors';
import {
  createNode,
  defaultLayoutFactory,
  stylesComponentFactory,
  TopologyDataContext,
  TopologySearchContext,
  TopologyViewLevel,
} from '@odf/shared/topology';
import {
  ClusterServiceVersionKind,
  DeploymentKind,
  NodeKind,
  PodKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  useFlag,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  Title,
} from '@patternfly/react-core';
import { ArrowCircleLeftIcon, TopologyIcon } from '@patternfly/react-icons';
import {
  useVisualizationController,
  TopologyView,
  VisualizationSurface,
  Visualization,
  VisualizationProvider,
  SELECTION_EVENT,
  TopologyControlBar,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  LabelPosition,
  NodeShape,
  GraphElement,
} from '@patternfly/react-topology';
import { CEPH_STORAGE_LABEL } from '../../constants';
import {
  CEPH_FLAG,
  MCG_STANDALONE,
  OCS_INDEPENDENT_FLAG,
} from '../../features';
import {
  nodeResource,
  odfDaemonSetResource,
  odfDeploymentsResource,
  odfPodsResource,
  odfReplicaSetResource,
  odfStatefulSetResource,
  storageClusterResource,
} from '../../resources';
import {
  STEP_INTO_EVENT,
  STEP_TO_CLUSTER,
  ZOOM_IN,
  ZOOM_OUT,
} from './constants';
import {
  generateDeploymentsInNodes,
  generateNodesInZone,
  generateStorageClusterGroup,
} from './NodeGenerator';
import TopologySideBar from './sidebar/TopologySideBar';
import { TopologyTopBar } from './TopBar';
import {
  generateNodeDeploymentsMap,
  getTopologyDomain,
  groupNodesByZones,
} from './utils';
import './topology.scss';

type SideBarProps = {
  onClose: any;
  isExpanded: boolean;
};

const Sidebar: React.FC<SideBarProps> = ({ onClose, isExpanded }) => {
  const { selectedElement: element } = React.useContext(TopologyDataContext);
  const data = element?.getData();
  const resource = data?.resource;

  return (
    <TopologySideBar
      resource={resource}
      onClose={onClose}
      isExpanded={isExpanded}
    />
  );
};

type BackButtonProps = {
  onClick: () => void;
};

const BackButton: React.FC<BackButtonProps> = ({ onClick }) => {
  const { t } = useCustomTranslation();
  return (
    <div className="odf-topology__back-button" onClick={onClick}>
      <ArrowCircleLeftIcon /> {t('Back to main view')}
    </div>
  );
};

const TopologyViewComponent: React.FC = () => {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentView, setCurrentView] = React.useState(TopologyViewLevel.NODES);
  const controller = useVisualizationController();

  const lastNode = React.useRef<string>();

  const [isSideBarOpen, setSideBarOpen] = React.useState(false);
  const {
    nodes,
    storageCluster,
    deployments,
    visualizationLevel,
    activeNode,
    nodeDeploymentMap,
    setSelectedElement,
  } = React.useContext(TopologyDataContext);

  const onCloseSideBar = React.useCallback(() => {
    setSideBarOpen(false);
    setSelectedIds([]);
  }, []);

  React.useEffect(() => {
    const selectionHandler = (ids: string[]) => {
      const element = controller.getElementById(ids[0]);
      if (!!element && !_.has(element.getData(), 'zone')) {
        setSelectedElement(element);
        setSelectedIds([ids[0]]);
        setSideBarOpen(true);
      }
    };
    controller.addEventListener(SELECTION_EVENT, selectionHandler);
    controller.addEventListener(STEP_INTO_EVENT, onCloseSideBar);
    controller.addEventListener(STEP_TO_CLUSTER, onCloseSideBar);
    return () => {
      controller.removeEventListener(SELECTION_EVENT, selectionHandler);
      controller.removeEventListener(STEP_INTO_EVENT, onCloseSideBar);
      controller.removeEventListener(STEP_TO_CLUSTER, onCloseSideBar);
    };
  }, [controller, setSelectedElement, onCloseSideBar]);

  React.useEffect(() => {
    const groupedNodes = groupNodesByZones(nodes);
    const dataModel = groupedNodes.map(generateNodesInZone);
    const flattenedDataModel = _.flatten(dataModel);
    const children = flattenedDataModel
      .filter((item) => item.type === 'group')
      .map((item) => item.id);
    const storageClusterGroup = generateStorageClusterGroup(storageCluster);
    storageClusterGroup.children = children;
    const data = {
      nodes: [storageClusterGroup, ...flattenedDataModel],
    };
    const model = {
      graph: {
        id: 'g1',
        type: 'graph',
        layout: 'Cola',
      },
      ...data,
    };
    controller.fromModel(model);
    // To handle initial render only, keeping array empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const currentNode = activeNode
      ? nodes.find((node) => getName(node) === activeNode)
      : nodes[0];

    const needsUpdate =
      currentView !== visualizationLevel || activeNode !== lastNode.current;
    if (activeNode !== lastNode.current) {
      lastNode.current = activeNode;
    }

    if (needsUpdate && TopologyViewLevel.DEPLOYMENTS === visualizationLevel) {
      const dataModel = generateDeploymentsInNodes(
        currentNode,
        nodeDeploymentMap
      );
      const model = {
        graph: {
          visualizationLevel,
          id: 'g1',
          type: 'graph',
          layout: 'Cola',
        },
        nodes: dataModel,
      };
      controller.fromModel(model, false);
      setCurrentView(TopologyViewLevel.DEPLOYMENTS);
    }
    if (needsUpdate && TopologyViewLevel.NODES === visualizationLevel) {
      const groupedNodes = groupNodesByZones(nodes);
      const dataModel = groupedNodes.map(generateNodesInZone);
      const flattenedDataModel = _.flatten(dataModel);
      const children = flattenedDataModel
        .filter((item) => item.type === 'group')
        .map((item) => item.id);
      const storageClusterGroup = generateStorageClusterGroup(storageCluster);
      storageClusterGroup.children = children;
      const data = {
        nodes: [storageClusterGroup, ...flattenedDataModel],
      };
      const model = {
        graph: {
          visualizationLevel,
          id: 'g1',
          type: 'graph',
          layout: 'Cola',
        },
        ...data,
      };
      controller.fromModel(model, false);
      setCurrentView(TopologyViewLevel.NODES);
    }
  }, [
    activeNode,
    controller,
    currentView,
    deployments,
    nodeDeploymentMap,
    nodes,
    storageCluster,
    visualizationLevel,
  ]);

  React.useEffect(() => {
    const currentModel = controller.toModel();
    const graphNodes = currentModel.nodes;
    let requiresUpdate = false;

    const existingIDs = graphNodes.map((node) => node.id);
    const inViewResources = [...nodes, ...deployments, storageCluster];
    const inViewUIDs = inViewResources.map(getUID);
    const childUIDsToBeRemoved = [];

    // Handle deletion of Resources
    const filtererdGraphNodes = graphNodes.filter((node) => {
      if (node.type !== 'group' && !inViewUIDs.includes(node.id)) {
        childUIDsToBeRemoved.push(node.id);
        return false;
      }
      return true;
    });
    if (childUIDsToBeRemoved.length > 0) {
      requiresUpdate = true;
      filtererdGraphNodes.forEach((node) => {
        if (node.type === 'group') {
          node.children = node.children.filter(
            (value) => !childUIDsToBeRemoved.includes(value)
          );
        }
      });
    }
    // Handle update of Resources
    filtererdGraphNodes.forEach((node) => {
      const resource = inViewResources.find(
        (n) => n.metadata.uid === getUID(node?.data?.resource)
      );
      if (!_.isEqual(node.data.resource, resource)) {
        requiresUpdate = true;
        node.data.resource = resource;
      }
    });

    // Handle addition of Resources
    const newResourcesUIDs = _.intersection(existingIDs, inViewUIDs);
    const newResources = inViewResources.filter((resource) =>
      newResourcesUIDs.includes(getUID(resource))
    );

    const newNodes: NodeKind[] = newResources.filter(
      (resource) => resource.kind === NodeModel.kind
    ) as any;
    const newDeployments = newResources.filter(
      (resource) => resource.kind === DeploymentModel.kind
    );

    const existingZones = graphNodes
      .filter((n) => n.type === 'group' && _.has(n.data, 'zone'))
      .map((n) => n.data.zone);

    const [newNodesInNewZones, newNodesInExistingZones] = newNodes.reduce(
      (acc, node) => {
        const newZonesArray = acc[0];
        const oldZonesArray = acc[1];
        if (existingZones.includes(getTopologyDomain(node))) {
          oldZonesArray.push(node);
        } else {
          newZonesArray.push(node);
        }
        return [newZonesArray, oldZonesArray];
      },
      [[], []]
    );
    const newZoneAndNodeGroup =
      newNodesInNewZones.length > 0
        ? generateNodesInZone(newNodesInNewZones)
        : [];

    const addedNodes = [];
    if (newNodesInExistingZones.length > 0) {
      requiresUpdate = true;
      newNodesInExistingZones.forEach((newNode) => {
        const nodeModel = createNode({
          id: getUID(newNode),
          label: getName(newNode),
          labelPosition: LabelPosition.bottom,
          badge: NodeModel.abbr,
          shape: NodeShape.ellipse,
          showStatusDecorator: true,
          showDecorators: true,
          resource: newNode,
        });
        addedNodes.push(nodeModel);
        filtererdGraphNodes.forEach((n) =>
          n.group && n.data.zone === getTopologyDomain(newNode)
            ? n.children.push(nodeModel.id)
            : _.noop
        );
      });
    }

    const newDeploymentNodes = newDeployments.map((deployment) => {
      const deploymentModel = createNode({
        id: getUID(deployment),
        label: getName(deployment),
        labelPosition: LabelPosition.bottom,
        badge: DeploymentModel.abbr,
        showStatusDecorator: true,
        resource: deployment,
      });
      return deploymentModel;
    });

    if (newDeploymentNodes.length > 0) {
      requiresUpdate = true;
      newDeployments.forEach((deployment) => {
        Object.entries(nodeDeploymentMap).forEach(([node, nodeDeployments]) => {
          const hasDeployment = !_.isUndefined(
            nodeDeployments.find((d) => getUID(d) === getUID(deployment))
          );
          if (hasDeployment) {
            filtererdGraphNodes.forEach((gNode) => {
              if (gNode.label === node) {
                gNode.children.push(getUID(deployment));
              }
            });
          }
        });
      });
    }

    const updatedModel = {
      ...currentModel,
      nodes: [...filtererdGraphNodes, ...newZoneAndNodeGroup, ...addedNodes],
    };
    if (requiresUpdate) {
      controller.fromModel(updatedModel);
    }
  }, [controller, nodes, deployments, nodeDeploymentMap, storageCluster]);

  const toggleVisualizationLevel = React.useCallback(
    () => controller.fireEvent(STEP_TO_CLUSTER),
    [controller]
  );

  return (
    <TopologyView
      controlBar={
        <TopologyControlBar
          data-test="topology-control-bar"
          controlButtons={createTopologyControlButtons({
            ...defaultControlButtonsOptions,
            zoomInCallback: () => {
              controller && controller.getGraph().scaleBy(ZOOM_IN);
            },
            zoomOutCallback: () => {
              controller && controller.getGraph().scaleBy(ZOOM_OUT);
            },
            fitToScreenCallback: () => {
              controller && controller.getGraph().fit(100);
            },
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
      {currentView === TopologyViewLevel.DEPLOYMENTS && (
        <BackButton onClick={toggleVisualizationLevel} />
      )}
      <VisualizationSurface state={{ selectedIds }} />
    </TopologyView>
  );
};

const Error = ({ error }) => <>{error}</>;

const Topology: React.FC = () => {
  const [controller, setController] = React.useState<Visualization>(null);
  const [visualizationLevel, setVisualizationLevel] =
    React.useState<TopologyViewLevel>(TopologyViewLevel.NODES);
  const [activeItemsUID, setActiveItemsUID] = React.useState<string[]>([]);
  const [activeItem, setActiveItem] = React.useState<string>('');
  const [activeNode, setActiveNode] = React.useState('');
  const [selectedElement, setSelectedElement] =
    React.useState<GraphElement>(null);

  const [nodes, nodesLoaded, nodesError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);

  const [storageCluster, storageClusterLoaded, storageClusterError] =
    useK8sWatchResource<StorageClusterKind[]>(storageClusterResource);

  const [deployments, deploymentsLoaded, deploymentsError] =
    useK8sWatchResource<DeploymentKind[]>(odfDeploymentsResource);

  const [pods, podsLoaded, podsError] =
    useK8sWatchResource<PodKind[]>(odfPodsResource);

  const [statefulSets, statefulSetLoaded, statefulSetError] =
    useK8sWatchResource<K8sResourceCommon[]>(odfStatefulSetResource);

  const [replicaSets, replicaSetsLoaded, replicaSetsError] =
    useK8sWatchResource<K8sResourceCommon[]>(odfReplicaSetResource);

  const [daemonSets, daemonSetsLoaded, daemonSetError] =
    useK8sWatchResource<K8sResourceCommon[]>(odfDaemonSetResource);

  const odfNodes = nodes.filter((node) =>
    _.has(node.metadata.labels, CEPH_STORAGE_LABEL)
  );

  const memoizedNodes = useDeepCompareMemoize(odfNodes, true);
  const memoizedDeployments = useDeepCompareMemoize(deployments, true);
  const memoizedPods = useDeepCompareMemoize(pods, true);
  const memoizedStatefulSets = useDeepCompareMemoize(statefulSets, true);
  const memoizedReplicaSets = useDeepCompareMemoize(replicaSets, true);
  const memoizedDaemonSets = useDeepCompareMemoize(daemonSets, true);

  const nodeDeploymentMap = React.useMemo(
    () =>
      generateNodeDeploymentsMap(
        memoizedNodes,
        memoizedPods,
        memoizedDeployments,
        ...memoizedReplicaSets,
        ...memoizedDaemonSets,
        ...memoizedStatefulSets,
        ...memoizedDeployments
      ),
    [
      memoizedDaemonSets,
      memoizedDeployments,
      memoizedNodes,
      memoizedPods,
      memoizedReplicaSets,
      memoizedStatefulSets,
    ]
  );

  const onStepInto = (args) => {
    const nodeName = args.label;
    setActiveNode(nodeName);
    setVisualizationLevel(TopologyViewLevel.DEPLOYMENTS);
  };

  const onStepOut = () => {
    setActiveNode('');
    setVisualizationLevel(TopologyViewLevel.NODES);
  };

  React.useEffect(() => {
    const temp = new Visualization();
    temp.registerLayoutFactory(defaultLayoutFactory);
    temp.registerComponentFactory(stylesComponentFactory);
    temp.addEventListener(STEP_INTO_EVENT, onStepInto);
    temp.addEventListener(STEP_TO_CLUSTER, onStepOut);
    setController(temp);

    return () => {
      temp.removeEventListener(STEP_INTO_EVENT, onStepInto);
      temp.removeEventListener(STEP_TO_CLUSTER, onStepOut);
    };
  }, []);

  const loading =
    !nodesLoaded ||
    !storageClusterLoaded ||
    !deploymentsLoaded ||
    !podsLoaded ||
    !statefulSetLoaded ||
    !replicaSetsLoaded ||
    !daemonSetsLoaded;

  const zones = memoizedNodes.map(getTopologyDomain);

  return (
    <TopologyDataContext.Provider
      value={{
        nodes: memoizedNodes,
        storageCluster: storageCluster[0],
        zones,
        deployments: memoizedDeployments,
        visualizationLevel: visualizationLevel,
        activeNode,
        setActiveNode,
        nodeDeploymentMap,
        selectedElement,
        setSelectedElement,
      }}
    >
      <TopologySearchContext.Provider
        value={{ activeItemsUID, setActiveItemsUID, activeItem, setActiveItem }}
      >
        <VisualizationProvider controller={controller}>
          <div className="odf__topology-view" id="odf-topology">
            <TopologyTopBar />
            <HandleErrorAndLoading
              loading={loading}
              error={
                storageClusterError ||
                nodesError ||
                deploymentsError ||
                podsError ||
                replicaSetsError ||
                daemonSetError ||
                statefulSetError
              }
              ErrorMessage={Error}
            >
              <TopologyViewComponent />
            </HandleErrorAndLoading>
          </div>
        </VisualizationProvider>
      </TopologySearchContext.Provider>
    </TopologyDataContext.Provider>
  );
};

type TopologyViewErrorMessageProps = {
  isExternalMode?: boolean;
};

const TopologyViewErrorMessage: React.FC<TopologyViewErrorMessageProps> = ({
  isExternalMode,
}) => {
  const { t } = useCustomTranslation();
  const [csv, csvLoaded, csvError] = useK8sWatchResource<
    ClusterServiceVersionKind[]
  >({
    kind: referenceForModel(ClusterServiceVersionModel),
    isList: true,
    namespace: CEPH_STORAGE_NAMESPACE,
  });

  const odfCsvName: string =
    csvLoaded && !csvError
      ? csv?.find((item) => item?.metadata?.name?.includes('odf-operator'))
          ?.metadata?.name
      : null;

  const createLink = `/k8s/ns/openshift-storage/operators.coreos.com~v1alpha1~ClusterServiceVersion/${odfCsvName}/odf.openshift.io~v1alpha1~StorageSystem/~new`;

  return (
    <EmptyState>
      <EmptyStateIcon icon={TopologyIcon} />
      <Title headingLevel="h4" size="lg">
        {isExternalMode
          ? t('Topology view is not supported for External Mode')
          : t('No StorageCluster found')}
      </Title>
      <EmptyStateBody>
        {!isExternalMode && t('Set up a storage cluster to view the topology')}
      </EmptyStateBody>
      {!isExternalMode && (
        <Link to={createLink}>{t('Create StorageSystem')} </Link>
      )}
    </EmptyState>
  );
};

const TopologyWithErrorHandler: React.FC = () => {
  const isCephAvailable = useFlag(CEPH_FLAG);
  const isMCGAvailable = useFlag(MCG_STANDALONE);
  const isExternalMode = useFlag(OCS_INDEPENDENT_FLAG);

  const showDashboard = (isCephAvailable || isMCGAvailable) && !isExternalMode;

  return showDashboard ? (
    <Topology />
  ) : (
    <TopologyViewErrorMessage isExternalMode={isExternalMode} />
  );
};

export default TopologyWithErrorHandler;
