import { ACMManagedClusterModel } from '@odf/shared';
import { getName, getUID } from '@odf/shared/selectors';
import { createNode } from '@odf/shared/topology';
import {
  LabelPosition,
  Model,
  NodeModel,
  NodeShape,
} from '@patternfly/react-topology';
import { ACMManagedClusterKind } from '../../../types';

/**
 * Generate a topology model from managed clusters
 */
export const generateClusterNodesModel = (
  clusters: ACMManagedClusterKind[]
): Model => {
  const clusterNodes: NodeModel[] = clusters.map((cluster) => {
    const id = getUID(cluster);
    const name = getName(cluster);

    return createNode({
      id,
      type: 'cluster-node', // Custom type for cluster nodes
      label: name,
      labelPosition: LabelPosition.bottom,
      badge: ACMManagedClusterModel.abbr || 'CL',
      shape: NodeShape.rect,
      showStatusDecorator: false,
      showDecorators: false,
      resource: cluster,
      kind: ACMManagedClusterModel.kind,
      width: 100,
      height: 100,
    });
  });

  return {
    graph: {
      id: 'mco-topology',
      type: 'graph',
      layout: 'ColaNoForce',
    },
    nodes: clusterNodes,
  };
};
