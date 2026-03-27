import {
  ComponentFactory,
  GraphComponent,
  ModelKind,
  NODE_DRAG_TYPE,
  graphDropTargetSpec,
  withDndDrop,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology';
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
      return withSelection()(MCOStyleNode);
    default:
      return undefined;
  }
};
