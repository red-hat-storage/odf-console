import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { getStorageClusterInNs } from '@odf/core/utils';
import HandleErrorAndLoading from '@odf/shared/error-handler/ErrorStateHandler';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { DeploymentModel, NodeModel } from '@odf/shared/models';
import { getName, getUID } from '@odf/shared/selectors';
import { BlueInfoCircleIcon } from '@odf/shared/status';
import {
  createNode,
  stylesComponentFactory,
  TopologyDataContext,
  TopologySearchContext,
  TopologyViewLevel,
  BaseTopologyView,
  useSelectionHandler,
  useTopologyControls,
  useVisualizationSetup,
  STEP_INTO_EVENT,
  STEP_TO_CLUSTER,
} from '@odf/shared/topology';
import {
  DeploymentKind,
  NodeKind,
  PodKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  K8sResourceCommon,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Link } from 'react-router-dom-v5-compat';
import {
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  Title,
} from '@patternfly/react-core';
import { ArrowCircleLeftIcon, TopologyIcon } from '@patternfly/react-icons';
import {
  useVisualizationController,
  VisualizationProvider,
  LabelPosition,
  NodeShape,
  GraphElement,
} from '@patternfly/react-topology';
import { cephStorageLabel, CREATE_SS_PAGE_URL } from '../../constants';
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
  hasAnyExternalOCS,
  hasAnyInternalOCS,
  hasAnyCeph,
  hasAnyNoobaaStandalone,
} from '../../utils';
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

type BackButtonProps = {
  onClick: () => void;
};

const MessageButton: React.FC = () => {
  const { t } = useCustomTranslation();
  const [showMessage, setShowMessage] = React.useState(false);

  return (
    <div className="odf-topology__message-button">
      <BlueInfoCircleIcon />{' '}
      {showMessage &&
        t('This view is not available for external mode cluster.')}{' '}
      <Button
        variant={ButtonVariant.link}
        isInline
        className="odf-topology__show-message-button"
        onClick={() => setShowMessage(!showMessage)}
      >
        {!showMessage ? t('Show message') : t('Hide message')}
      </Button>
    </div>
  );
};

const BackButton: React.FC<BackButtonProps> = ({ onClick }) => {
  const { t } = useCustomTranslation();
  return (
    <Button
      icon={<ArrowCircleLeftIcon />}
      variant={ButtonVariant.plain}
      className="odf-topology__back-button"
      onClick={onClick}
    >
      {t('Back to main view')}
    </Button>
  );
};

const shouldSelectElement = (element: GraphElement) =>
  !_.has(element.getData(), 'zone');

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
    nodeOsdCountMap,
    setSelectedElement,
  } = React.useContext(TopologyDataContext);

  const onCloseSideBar = React.useCallback(() => {
    setSideBarOpen(false);
    setSelectedIds([]);
  }, []);

  const additionalCloseEvents = React.useMemo(
    () => [STEP_INTO_EVENT, STEP_TO_CLUSTER],
    []
  );

  useSelectionHandler({
    controller,
    setSelectedElement,
    setSelectedIds,
    setSideBarOpen,
    shouldSelect: shouldSelectElement,
    additionalCloseEvents,
    onCloseSideBar,
  });

  React.useEffect(() => {
    const groupedNodes = groupNodesByZones(nodes);
    const dataModel = groupedNodes.map((nodesInZone) =>
      generateNodesInZone(nodesInZone, nodeOsdCountMap)
    );
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
      const dataModel = groupedNodes.map((nodesInZone) =>
        generateNodesInZone(nodesInZone, nodeOsdCountMap)
      );
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
    nodeOsdCountMap,
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
        ? generateNodesInZone(newNodesInNewZones, nodeOsdCountMap)
        : [];

    const addedNodes = [];
    if (newNodesInExistingZones.length > 0) {
      requiresUpdate = true;
      newNodesInExistingZones.forEach((newNode) => {
        const nodeName = getName(newNode);
        const osdCount = nodeOsdCountMap?.[nodeName] || 0;
        const nodeModel = createNode({
          id: getUID(newNode),
          label: nodeName,
          labelPosition: LabelPosition.bottom,
          badge: NodeModel.abbr,
          shape: NodeShape.ellipse,
          showStatusDecorator: true,
          showDecorators: true,
          resource: newNode,
          osdCount,
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
  }, [
    controller,
    nodes,
    deployments,
    nodeDeploymentMap,
    nodeOsdCountMap,
    storageCluster,
  ]);

  const toggleVisualizationLevel = React.useCallback(
    () => controller.fireEvent(STEP_TO_CLUSTER),
    [controller]
  );

  const controlButtons = useTopologyControls({ controller });

  return (
    <BaseTopologyView
      controlButtons={controlButtons}
      sideBar={
        <TopologySideBar
          resource={
            React.useContext(TopologyDataContext).selectedElement?.getData()
              ?.resource
          }
          onClose={onCloseSideBar}
          isExpanded={isSideBarOpen}
        />
      }
      sideBarResizable={true}
      minSideBarSize="400px"
      sideBarOpen={isSideBarOpen}
      selectedIds={selectedIds}
    >
      {currentView === TopologyViewLevel.DEPLOYMENTS && (
        <BackButton onClick={toggleVisualizationLevel} />
      )}
      <MessageButton />
    </BaseTopologyView>
  );
};

const Topology: React.FC = () => {
  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const [visualizationLevel, setVisualizationLevel] =
    React.useState<TopologyViewLevel>(TopologyViewLevel.NODES);
  const [activeItemsUID, setActiveItemsUID] = React.useState<string[]>([]);
  const [activeItem, setActiveItem] = React.useState<string>('');
  const [activeNode, setActiveNode] = React.useState('');
  const [selectedElement, setSelectedElement] =
    React.useState<GraphElement>(null);

  const [nodes, nodesLoaded, nodesError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);

  const [storageClusters, storageClustersLoaded, storageClustersError] =
    useK8sWatchResource<StorageClusterKind[]>(storageClusterResource);

  const [deployments, deploymentsLoaded, deploymentsError] =
    useSafeK8sWatchResource<DeploymentKind[]>(odfDeploymentsResource);

  const [pods, podsLoaded, podsError] =
    useSafeK8sWatchResource<PodKind[]>(odfPodsResource);

  const [statefulSets, statefulSetLoaded, statefulSetError] =
    useSafeK8sWatchResource<K8sResourceCommon[]>(odfStatefulSetResource);

  const [replicaSets, replicaSetsLoaded, replicaSetsError] =
    useSafeK8sWatchResource<K8sResourceCommon[]>(odfReplicaSetResource);

  const [daemonSets, daemonSetsLoaded, daemonSetError] =
    useSafeK8sWatchResource<K8sResourceCommon[]>(odfDaemonSetResource);

  const osdPods = React.useMemo(
    () =>
      podsLoaded && !podsError
        ? pods.filter((pod) => pod.metadata.labels?.['app'] === 'rook-ceph-osd')
        : [],
    [pods, podsLoaded, podsError]
  );

  // ToDo (epic 4422): This will work as Internal mode cluster will only be created in ODF install namespace.
  // Still, make this generic so that this works even if it gets created in a different namespace.
  const storageCluster: StorageClusterKind = getStorageClusterInNs(
    storageClusters,
    odfNamespace
  );

  const storageLabel = cephStorageLabel(odfNamespace);
  const odfNodes = nodes.filter((node) =>
    _.has(node.metadata.labels, storageLabel)
  );

  const memoizedNodes = useDeepCompareMemoize(odfNodes, true);
  const memoizedDeployments = useDeepCompareMemoize(deployments, true);
  const memoizedPods = useDeepCompareMemoize(pods, true);
  const memoizedStatefulSets = useDeepCompareMemoize(statefulSets, true);
  const memoizedReplicaSets = useDeepCompareMemoize(replicaSets, true);
  const memoizedDaemonSets = useDeepCompareMemoize(daemonSets, true);

  const nodeOsdCountMap = React.useMemo(() => {
    if (!osdPods) return {};

    return memoizedNodes.reduce<Record<string, number>>((acc, node) => {
      const nodeName = getName(node);
      const osdCount = osdPods.filter(
        (pod): pod is PodKind => pod != null && pod?.spec?.nodeName === nodeName
      ).length;
      acc[nodeName] = osdCount;
      return acc;
    }, {});
  }, [memoizedNodes, osdPods]);

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

  const onStepInto = React.useCallback((args) => {
    const nodeName = args.label;
    setActiveNode(nodeName);
    setVisualizationLevel(TopologyViewLevel.DEPLOYMENTS);
  }, []);

  const onStepOut = React.useCallback(() => {
    setActiveNode('');
    setVisualizationLevel(TopologyViewLevel.NODES);
  }, []);

  const eventListeners = React.useMemo(
    () => [
      { event: STEP_INTO_EVENT, handler: onStepInto },
      { event: STEP_TO_CLUSTER, handler: onStepOut },
    ],
    [onStepInto, onStepOut]
  );

  const controller = useVisualizationSetup({
    componentFactory: stylesComponentFactory as any,
    eventListeners,
  });

  const loading =
    !nodesLoaded ||
    !storageClustersLoaded ||
    !deploymentsLoaded ||
    !podsLoaded ||
    !statefulSetLoaded ||
    !replicaSetsLoaded ||
    !daemonSetsLoaded ||
    !isODFNsLoaded;

  const zones = memoizedNodes.map(getTopologyDomain);

  const topologyDataContextData = React.useMemo(() => {
    return {
      nodes: memoizedNodes,
      storageCluster: storageCluster,
      zones,
      deployments: memoizedDeployments,
      visualizationLevel: visualizationLevel,
      activeNode,
      setActiveNode,
      nodeDeploymentMap,
      nodeOsdCountMap,
      pods: memoizedPods,
      podsLoaded,
      podsLoadError: podsError,
      osdPods,
      selectedElement,
      setSelectedElement: setSelectedElement as any,
    };
  }, [
    memoizedNodes,
    storageCluster,
    zones,
    memoizedDeployments,
    visualizationLevel,
    activeNode,
    nodeDeploymentMap,
    nodeOsdCountMap,
    memoizedPods,
    podsLoaded,
    podsError,
    osdPods,
    selectedElement,
  ]);

  const topologySearchContextData = React.useMemo(() => {
    return { activeItemsUID, setActiveItemsUID, activeItem, setActiveItem };
  }, [activeItemsUID, setActiveItemsUID, activeItem, setActiveItem]);

  return (
    <TopologyDataContext.Provider value={topologyDataContextData}>
      <TopologySearchContext.Provider value={topologySearchContextData}>
        <VisualizationProvider controller={controller}>
          <div className="odf__topology-view" id="odf-topology">
            <TopologyTopBar />
            <HandleErrorAndLoading
              loading={loading}
              error={
                storageClustersError ||
                nodesError ||
                deploymentsError ||
                podsError ||
                replicaSetsError ||
                daemonSetError ||
                statefulSetError ||
                odfNsLoadError
              }
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
  isInternalMode?: boolean;
};

const TopologyViewErrorMessage: React.FC<TopologyViewErrorMessageProps> = ({
  isExternalMode,
  isInternalMode,
}) => {
  const { t } = useCustomTranslation();

  const { isNsSafe } = useODFNamespaceSelector();

  // If external mode cluster exists, we do not allow internal mode cluster creation (in case of multiple StorageSystem support)
  const hideCreateSSOption = (isExternalMode && !isInternalMode) || !isNsSafe;
  return (
    <EmptyState
      titleText={
        <Title headingLevel="h4" size="lg">
          {isExternalMode
            ? t('Topology view is not supported for External mode')
            : t('No StorageCluster found')}
        </Title>
      }
      icon={TopologyIcon}
    >
      <EmptyStateBody>
        {!hideCreateSSOption &&
          t('Set up a storage cluster to view the topology')}
      </EmptyStateBody>
      {!hideCreateSSOption && (
        <Link to={CREATE_SS_PAGE_URL}>{t('Create storage system')} </Link>
      )}
    </EmptyState>
  );
};

const TopologyWithErrorHandler: React.FC = () => {
  const { systemFlags } = useODFSystemFlagsSelector();

  const isCephAvailable = hasAnyCeph(systemFlags);
  const isMCGStandalone = hasAnyNoobaaStandalone(systemFlags);
  const isExternalMode = hasAnyExternalOCS(systemFlags);
  const isInternalMode = hasAnyInternalOCS(systemFlags);

  const showDashboard = (isCephAvailable || isMCGStandalone) && isInternalMode;

  return showDashboard ? (
    <Topology />
  ) : (
    <TopologyViewErrorMessage
      isExternalMode={isExternalMode}
      isInternalMode={isInternalMode}
    />
  );
};

export default TopologyWithErrorHandler;
