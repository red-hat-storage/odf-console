import {
  BreadthFirstLayout,
  ColaLayout,
  ConcentricLayout,
  DagreLayout,
  ForceLayout,
  Graph,
  GridLayout,
  Layout,
  LayoutFactory,
} from '@patternfly/react-topology';
import { TOPOLOGY_CONSTANTS } from '../constants';

const MCO_COLA_OPTIONS = {
  layoutOnDrag: false,
  nodeDistance: TOPOLOGY_CONSTANTS.LAYOUT_NODE_DISTANCE,
  groupDistance: TOPOLOGY_CONSTANTS.LAYOUT_GROUP_DISTANCE,
  linkDistance: TOPOLOGY_CONSTANTS.LAYOUT_LINK_DISTANCE,
  collideDistance: TOPOLOGY_CONSTANTS.LAYOUT_COLLIDE_DISTANCE,
};

/**
 * Layout factory tuned for MCO topology. Uses Cola (not ColaGroups) because nested
 * pairing boxes + cluster groups + failover edges produce invalid webcola VPSC
 * constraints in ColaGroupsLayout.
 */
export const mcoLayoutFactory: LayoutFactory = (
  type: string,
  graph: Graph
): Layout | undefined => {
  switch (type) {
    case 'Cola':
    case 'ColaNoForce':
    case 'ColaGroups':
      return new ColaLayout(graph, MCO_COLA_OPTIONS);
    case 'BreadthFirst':
      return new BreadthFirstLayout(graph);
    case 'Concentric':
      return new ConcentricLayout(graph);
    case 'Dagre':
      return new DagreLayout(graph);
    case 'Force':
      return new ForceLayout(graph);
    case 'Grid':
      return new GridLayout(graph);
    default:
      return new ColaLayout(graph, MCO_COLA_OPTIONS);
  }
};
