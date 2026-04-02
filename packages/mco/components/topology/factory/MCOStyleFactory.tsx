import {
  ComponentFactory,
  GraphComponent,
  ModelKind,
  NODE_DRAG_TYPE,
  graphDropTargetSpec,
  nodeDragSourceSpec,
  withDndDrop,
  withDragNode,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';
import { MCOFailoverNode } from './MCOFailoverNode';
import { MCOPairingBox } from './MCOPairingBox';
import MCOStyleAppGroup from './MCOStyleAppGroup';
import { MCOStyleAppNode } from './MCOStyleAppNode';
import { MCOStyleEdge } from './MCOStyleEdge';
import { MCOStyleNode } from './MCOStyleNode';

export const mcoTopologyComponentFactory: ComponentFactory = (
  kind: ModelKind,
  type: string
) => {
  if (kind === ModelKind.graph) {
    return withDndDrop(graphDropTargetSpec([NODE_DRAG_TYPE]))(
      withPanZoom()(GraphComponent)
    );
  }
  switch (type) {
    case 'cluster-node':
      return withDragNode(nodeDragSourceSpec('cluster-node', true, true))(
        withSelection()(MCOStyleNode)
      );
    case 'app-node-operation':
      return withDragNode(nodeDragSourceSpec('app-node-operation', true, true))(
        withSelection()(MCOStyleAppNode)
      );
    case 'group':
      return withDragNode(nodeDragSourceSpec('group', true, true))(
        withSelection()(MCOStyleAppGroup)
      );
    case 'pairing-box':
      return withDragNode(nodeDragSourceSpec('pairing-box', true, true))(
        withSelection()(MCOPairingBox)
      );
    case 'failover-node':
      return withDragNode(nodeDragSourceSpec('failover-node', true, true))(
        withSelection()(MCOFailoverNode)
      );
    case 'app-operation-edge':
      return withSelection()(MCOStyleEdge);
    default:
      return undefined;
  }
};
