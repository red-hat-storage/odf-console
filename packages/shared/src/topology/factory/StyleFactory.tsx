import {
  ComponentFactory,
  withDragNode,
  withSelection,
  ModelKind,
  withPanZoom,
  GraphComponent,
  withDndDrop,
  nodeDragSourceSpec,
  groupDropTargetSpec,
  graphDropTargetSpec,
  NODE_DRAG_TYPE,
} from '@patternfly/react-topology';
import StyleGroup from './StyleGroup';
import StyleNode from './StyleNode';

export const stylesComponentFactory: ComponentFactory = (
  kind: ModelKind,
  type: string
) => {
  if (kind === ModelKind.graph) {
    return withDndDrop(graphDropTargetSpec([NODE_DRAG_TYPE]))(
      withPanZoom()(GraphComponent)
    );
  }
  switch (type) {
    case 'node':
      return withDragNode(nodeDragSourceSpec('node', true, true))(
        withSelection()(StyleNode)
      );
    case 'group':
      return withDndDrop(groupDropTargetSpec)(
        withDragNode(nodeDragSourceSpec('group'))(withSelection()(StyleGroup))
      );
    default:
      return undefined;
  }
};
