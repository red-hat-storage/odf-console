/**
 * Topology layout and styling constants
 */
export const TOPOLOGY_CONSTANTS = {
  /** Padding inside cluster groups (px) */
  CLUSTER_GROUP_PADDING: 40,
  /** Padding inside pairing boxes (px) */
  PAIRING_BOX_PADDING: 70,
  /** ColaGroups spacing between leaf nodes (px) */
  LAYOUT_NODE_DISTANCE: 60,
  /** ColaGroups padding around nested groups (px) */
  LAYOUT_GROUP_DISTANCE: 70,
  /** ColaGroups ideal edge length — keeps failover nodes centered between clusters (px) */
  LAYOUT_LINK_DISTANCE: 150,
  /** ColaGroups minimum gap between node bounds (px) */
  LAYOUT_COLLIDE_DISTANCE: 25,
  /** Default node width (px) */
  NODE_WIDTH: 75,
  /** Default node height (px) */
  NODE_HEIGHT: 75,
  /** App node width (px) */
  APP_NODE_WIDTH: 50,
  /** App node height (px) */
  APP_NODE_HEIGHT: 50,
  /** Failover node width (px) */
  FAILOVER_NODE_WIDTH: 60,
  /** Failover node height (px) */
  FAILOVER_NODE_HEIGHT: 60,
} as const;
