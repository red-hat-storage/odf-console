import { DeploymentModel, NodeModel as MachineModel } from '@odf/shared/models';
import { getName, getUID } from '@odf/shared/selectors';
import {
  createNode,
  NodeDeploymentMap,
  AlertFiringComponent,
} from '@odf/shared/topology';
import { NodeKind, StorageClusterKind } from '@odf/shared/types';
import {
  LabelPosition,
  NodeModel,
  NodeShape,
  NodeStatus,
} from '@patternfly/react-topology';
import { getTopologyDomain } from './utils';

export const generateDeploymentsInNodes = (
  node: NodeKind,
  nodeDeploymentMap: NodeDeploymentMap
) => {
  const name = getName(node);
  const relevantDeployments = nodeDeploymentMap[name];
  const group: NodeModel = {
    id: name,
    children: [],
    type: 'group',
    group: true,
    label: name,
    style: { padding: 20 },
    data: {
      component: AlertFiringComponent.Node,
      resource: node,
    },
  };

  const deploymentsInNode: NodeModel[] = relevantDeployments.map(
    (deployment) => {
      const id = getUID(deployment);
      const deploymentModel = createNode({
        id,
        label: getName(deployment),
        labelPosition: LabelPosition.bottom,
        badge: DeploymentModel.abbr,
        showStatusDecorator: true,
        resource: deployment,
        kind: DeploymentModel.kind,
      });
      return deploymentModel;
    }
  );
  group.children = deploymentsInNode.map((e) => e.id);
  return [...deploymentsInNode, group];
};

/**
 * Generate a NodeModel from Nodes of a particular Zone
 */
export const generateNodesInZone = (
  nodes: NodeKind[],
  nodeOsdCountMap?: Record<string, number>
): NodeModel[] => {
  const zone = getTopologyDomain(nodes[0]);

  const group: NodeModel = {
    id: zone,
    children: [],
    type: 'group',
    status: NodeStatus.default,
    group: true,
    label: zone,
    height: 50,
    width: 50,
    style: { padding: 50, minHeight: 30, minWidth: 30 },
    data: {
      component: AlertFiringComponent.Node,
      zone,
    },
  };

  const nodesInZone: NodeModel[] = nodes.map((node) => {
    const id = getUID(node);
    const nodeName = getName(node);
    const osdCount = nodeOsdCountMap?.[nodeName] || 0;
    const nodeModel = createNode({
      id,
      label: nodeName,
      labelPosition: LabelPosition.bottom,
      badge: MachineModel.abbr,
      shape: NodeShape.ellipse,
      showStatusDecorator: true,
      showDecorators: true,
      resource: node,
      kind: MachineModel.kind,
      osdCount,
    });
    return nodeModel;
  });

  group.children = nodesInZone.map((node) => node.id);
  return [...nodesInZone, group];
};

export const generateStorageClusterGroup = (
  storageCluster: StorageClusterKind
): NodeModel => {
  const id = getUID(storageCluster);
  const name = getName(storageCluster);
  const nodeModel: NodeModel = {
    id,
    children: [],
    type: 'group',
    group: true,
    label: name,
    labelPosition: LabelPosition.bottom,
    style: { padding: 50 },
    data: {
      component: AlertFiringComponent.Cluster,
      resource: storageCluster,
      name,
    },
  };
  return nodeModel;
};
