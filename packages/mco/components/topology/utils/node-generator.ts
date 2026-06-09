import { ACMManagedClusterModel } from '@odf/shared';
import { getName, getUID } from '@odf/shared/selectors';
import { createNode } from '@odf/shared/topology';
import { K8sResourceCondition } from '@odf/shared/types';
import {
  LabelPosition,
  Model,
  NodeModel,
  NodeShape,
  EdgeModel,
  TopologyQuadrant,
} from '@patternfly/react-topology';
import { MANAGED_CLUSTER_CONDITION_AVAILABLE } from '../../../constants';
import { ClusterPairOperationsMap } from '../../../hooks/useActiveDROperations';
import {
  ClusterPairPoliciesMap,
  DRPolicyInfo,
  getClustersFromPairKey,
} from '../../../hooks/useDRPoliciesByClusterPair';
import { ClusterAppsMap } from '../../../hooks/useProtectedAppsByCluster';
import { ACMManagedClusterKind, DRPolicyKind, Phase } from '../../../types';
import {
  getReplicationHealth,
  getReplicationType,
  getProtectedCondition,
} from '../../../utils';
import { getDRStatus, isCleanupRequired } from '../../../utils/dr-status';
import { TOPOLOGY_CONSTANTS } from '../constants';
import {
  DecoratorIcon,
  FilterOptions,
  FilterType,
  ProtectedAppInfo,
  DROperationInfo,
  TopologyNodeData,
} from '../types';
import { getDecoratorForStatus } from './decorator-helpers';

/**
 * Helper function to check if a cluster is healthy
 */
const isClusterHealthy = (cluster: ACMManagedClusterKind): boolean => {
  const conditions: K8sResourceCondition[] = cluster.status?.conditions || [];
  return !!conditions.find(
    (c) => c.type === MANAGED_CLUSTER_CONDITION_AVAILABLE && c.status === 'True'
  );
};

/**
 * Helper function to create grouped operation nodes
 * Reduces duplication in handling source vs target operations
 */
const computeOperationDRStatus = (
  drpc: DROperationInfo['drpc'],
  phase: string,
  progression: string,
  drPolicyByName: Map<string, DRPolicyKind>
) => {
  const drPolicyName = drpc?.spec?.drPolicyRef?.name;
  const drPolicy = drPolicyName ? drPolicyByName.get(drPolicyName) : undefined;
  const schedulingInterval = drPolicy?.spec?.schedulingInterval;
  const protectedCondition = getProtectedCondition(drpc);
  const volumeLastGroupSyncTime = drpc?.status?.lastGroupSyncTime;

  const volumeReplicationHealth = getReplicationHealth(
    volumeLastGroupSyncTime,
    schedulingInterval,
    drPolicy ? getReplicationType(drPolicy) : undefined
  );

  const kubeObjectSchedulingInterval =
    drpc?.spec?.kubeObjectProtection?.captureInterval;
  const kubeObjectReplicationHealth = kubeObjectSchedulingInterval
    ? getReplicationHealth(
        drpc?.status?.lastKubeObjectProtectionTime,
        kubeObjectSchedulingInterval
      )
    : undefined;

  return getDRStatus({
    isCleanupRequired: isCleanupRequired(phase, progression),
    phase: phase as Phase,
    volumeReplicationHealth,
    kubeObjectReplicationHealth,
    progression,
    volumeLastGroupSyncTime,
    protectedCondition,
    schedulingInterval,
    actionStartTime: drpc?.status?.actionStartTime,
  });
};

const createGroupedOperationNodes = (
  opsByPhase: Map<string, DROperationInfo[]>,
  isSource: boolean,
  clusterName: string,
  drPolicyByName: Map<string, DRPolicyKind>
): NodeModel[] => {
  const nodes: NodeModel[] = [];

  opsByPhase.forEach((ops, groupKey) => {
    const count = ops.length;
    const action = ops[0].action;
    const phase = ops[0].phase || 'Unknown';
    const progression = ops[0].progression;
    const effectiveStatus = computeOperationDRStatus(
      ops[0].drpc,
      phase,
      progression,
      drPolicyByName
    );
    const label = effectiveStatus;
    const directionLabel = isSource ? 'source' : 'target';
    const appId = `app-group-${clusterName}-${directionLabel}-${groupKey}`;

    const appNode = createNode({
      id: appId,
      type: 'app-node-operation',
      label,
      labelPosition: LabelPosition.bottom,
      badge: 'DRPC',
      shape: NodeShape.rect,
      resource: ops[0].pav,
      width: TOPOLOGY_CONSTANTS.APP_NODE_WIDTH,
      height: TOPOLOGY_CONSTANTS.APP_NODE_HEIGHT,
    } as any);

    const decorator = getDecoratorForStatus(
      effectiveStatus,
      TopologyQuadrant.upperLeft
    );

    (appNode.data as TopologyNodeData) = {
      ...(appNode.data || {}),
      operations: ops,
      operation: count === 1 ? ops[0] : undefined,
      isSource,
      clusterName,
      isGrouped: count > 1,
      appCount: count,
      action,
      phase,
      progression,
      decorators: [decorator],
    };
    nodes.push(appNode);
  });

  return nodes;
};

/**
 * Generate app nodes and cluster group for a cluster with apps
 * Following the ODF pattern: generateDeploymentsInNodes
 */
const generateClusterWithApps = (
  cluster: ACMManagedClusterKind,
  apps: ProtectedAppInfo[],
  drPolicyByName: Map<string, DRPolicyKind>,
  operations?: DROperationInfo[]
): NodeModel[] => {
  const clusterName = getName(cluster);

  // Create app nodes (children)
  const appNodes: NodeModel[] = [];

  // Track which apps are in operations (by PAV name, not DRPC name)
  const appsInOperations = new Set<string>();

  // Group operations by action type, direction (source/target), and phase
  if (operations && operations.length > 0) {
    // Group operations by action-phase for source cluster
    const sourceOperationsByActionPhase = new Map<string, DROperationInfo[]>();
    // Group operations by action-phase for target cluster
    const targetOperationsByActionPhase = new Map<string, DROperationInfo[]>();

    operations.forEach((op) => {
      // Track by application name to match with static apps from useProtectedAppsByCluster
      // op.applicationName contains the actual app name (e.g., "busybox-1")
      // which matches app.name from ProtectedAppInfo
      appsInOperations.add(op.applicationName);

      // Use action + effective status as the grouping key so that
      // operations in different progression states (e.g. FailedOver vs WaitOnUserToCleanUp)
      // are shown as separate nodes.
      const phase = op.phase || 'Unknown';
      const effectiveStatus = computeOperationDRStatus(
        op.drpc,
        phase,
        op.progression,
        drPolicyByName
      );
      const groupKey = `${op.action}-${effectiveStatus}`;

      if (op.isSource) {
        if (!sourceOperationsByActionPhase.has(groupKey)) {
          sourceOperationsByActionPhase.set(groupKey, []);
        }
        sourceOperationsByActionPhase.get(groupKey)!.push(op);
      } else {
        if (!targetOperationsByActionPhase.has(groupKey)) {
          targetOperationsByActionPhase.set(groupKey, []);
        }
        targetOperationsByActionPhase.get(groupKey)!.push(op);
      }
    });

    // Create grouped nodes for source and target operations using helper
    const sourceNodes = createGroupedOperationNodes(
      sourceOperationsByActionPhase,
      true,
      clusterName,
      drPolicyByName
    );
    const targetNodes = createGroupedOperationNodes(
      targetOperationsByActionPhase,
      false,
      clusterName,
      drPolicyByName
    );
    appNodes.push(...sourceNodes, ...targetNodes);
  }

  // Group static apps (those not in operations) by their status within this cluster
  if (apps && apps.length > 0) {
    // Filter out apps that are currently in operations
    const staticApps = apps.filter((app) => !appsInOperations.has(app.name));

    if (staticApps.length > 0) {
      const appsByStatus = staticApps.reduce<
        Record<string, ProtectedAppInfo[]>
      >((acc, app) => {
        const status = app.status || 'Unknown';
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(app);
        return acc;
      }, {});

      // Create one node per status group within this cluster
      Object.entries(appsByStatus).forEach(
        ([status, groupedApps]: [string, ProtectedAppInfo[]]) => {
          const count = groupedApps.length;
          const firstApp = groupedApps[0];
          const label = status;

          const appNode = createNode({
            id: `app-group-${clusterName}-${status}`,
            type: 'app-node-operation',
            label,
            labelPosition: LabelPosition.bottom,
            badge: 'DRPC',
            shape: NodeShape.rect,
            resource: firstApp.pav,
            width: TOPOLOGY_CONSTANTS.APP_NODE_WIDTH,
            height: TOPOLOGY_CONSTANTS.APP_NODE_HEIGHT,
          } as any);

          const decorator = getDecoratorForStatus(
            status,
            TopologyQuadrant.upperLeft
          );

          (appNode.data as TopologyNodeData) = {
            ...(appNode.data || {}),
            apps: groupedApps,
            appCount: count,
            appStatus: status,
            clusterName,
            isStatic: true,
            decorators: [decorator],
          };
          appNodes.push(appNode);
        }
      );
    }
  }

  // Check cluster health status
  const isHealthy = isClusterHealthy(cluster);

  // Create cluster group (parent)
  const group: NodeModel = {
    id: `cluster-group-${clusterName}`,
    type: 'group',
    group: true,
    label: clusterName,
    labelPosition: LabelPosition.bottom,
    children: appNodes.map((n) => n.id),
    style: { padding: TOPOLOGY_CONSTANTS.CLUSTER_GROUP_PADDING },
    collapsed: false,
    data: {
      isClusterGroup: true,
      resource: cluster,
      kind: ACMManagedClusterModel.kind,
      collapsible: false,
      canDropOnNode: false,
      decorators: [
        {
          quadrant: TopologyQuadrant.upperRight,
          icon: isHealthy
            ? DecoratorIcon.CheckCircle
            : DecoratorIcon.ExclamationCircle,
          tooltip: isHealthy ? 'Healthy' : 'Unhealthy',
        },
      ],
    },
  };

  if (appNodes.length === 0) {
    return [];
  }

  // Return children first, then parent (ODF pattern)
  return [...appNodes, group];
};

/**
 * Helper to check if a string matches the search value
 */
const matchesSearch = (text: string, searchValue: string): boolean => {
  if (!searchValue) return true;
  return text.toLowerCase().includes(searchValue.toLowerCase());
};

/**
 * Helper to check if an operation matches the filter criteria
 */
const matchesOperationFilter = (
  op: DROperationInfo,
  filters: FilterOptions,
  clusterName: string
): boolean => {
  const { searchValue, filterTypes = [] } = filters;

  if (!searchValue && filterTypes.length === 0) {
    return true;
  }

  if (!searchValue && filterTypes.length > 0) {
    return true;
  }

  const appName = op.applicationName;
  const namespace = op.pav?.metadata?.namespace || '';

  if (filterTypes.length === 0 && searchValue) {
    return (
      matchesSearch(appName, searchValue) ||
      matchesSearch(clusterName, searchValue) ||
      matchesSearch(namespace, searchValue)
    );
  }
  if (
    filterTypes.includes(FilterType.Cluster) &&
    matchesSearch(clusterName, searchValue)
  ) {
    return true;
  }
  return false;
};

/**
 * Resolve the graph node id for a cluster from nodes that exist in the model.
 */
const resolveClusterNodeId = (
  clusterName: string,
  existingNodeIds: Set<string>,
  clusterNameToUID: Map<string, string>
): string | undefined => {
  const groupId = `cluster-group-${clusterName}`;
  if (existingNodeIds.has(groupId)) {
    return groupId;
  }
  const uid = clusterNameToUID.get(clusterName);
  if (uid && existingNodeIds.has(uid)) {
    return uid;
  }
  return undefined;
};

/**
 * Group nodes need dimensions before Cola layout; bounds may be unset on first pass.
 */
const ensureNodeDimensions = (nodes: NodeModel[]): NodeModel[] =>
  nodes.map((node) => {
    if (!node.group) {
      return node;
    }
    const width = node.width ?? TOPOLOGY_CONSTANTS.NODE_WIDTH;
    const height = node.height ?? TOPOLOGY_CONSTANTS.NODE_HEIGHT;
    if (node.width === width && node.height === height) {
      return node;
    }
    return { ...node, width, height };
  });

/**
 * Remove dangling group children and edges so the layout engine never sees undefined nodes.
 */
const sanitizeTopologyModel = (
  nodes: NodeModel[],
  edges: EdgeModel[]
): { nodes: NodeModel[]; edges: EdgeModel[] } => {
  const nodeIdSet = new Set(nodes.map((node) => node.id));

  const sanitizedNodes = nodes
    .map((node) => {
      if (!node.children?.length) {
        return node;
      }
      const validChildren = node.children.filter((childId) =>
        nodeIdSet.has(childId)
      );
      if (validChildren.length === node.children.length) {
        return node;
      }
      return { ...node, children: validChildren };
    })
    .filter((node) => {
      if (node.group && node.children) {
        return node.children.length > 0;
      }
      return true;
    });

  // Each node may only belong to one group's children list (webcola breaks otherwise)
  const childToParent = new Map<string, string>();
  sanitizedNodes.forEach((node) => {
    node.children?.forEach((childId) => {
      if (!childToParent.has(childId)) {
        childToParent.set(childId, node.id as string);
      }
    });
  });

  const dedupedNodes = sanitizedNodes.map((node) => {
    if (!node.children?.length) {
      return node;
    }
    const uniqueChildren = node.children.filter(
      (childId, index, arr) =>
        arr.indexOf(childId) === index && childToParent.get(childId) === node.id
    );
    if (uniqueChildren.length === node.children.length) {
      return node;
    }
    return { ...node, children: uniqueChildren };
  });

  const finalIds = new Set(dedupedNodes.map((node) => node.id));
  const sanitizedEdges = edges.filter(
    (edge) =>
      finalIds.has(edge.source as string) && finalIds.has(edge.target as string)
  );

  return {
    nodes: ensureNodeDimensions(dedupedNodes),
    edges: sanitizedEdges,
  };
};

/**
 * Helper to check if an app matches the filter criteria.
 *
 * Filter behavior:
 * - No filters/search: show all apps
 * - Filter types selected without search: show all apps (filter types are just selection, not restriction)
 * - Search without filter types: match search against all fields (app name, cluster, namespace)
 * - Search with filter types: match search only against selected filter type fields
 *
 * @param app - The protected application to check
 * @param filters - Filter options containing search value and selected filter types
 * @param clusterName - Name of the cluster containing this app
 * @returns true if the app matches the filter criteria
 */
const matchesAppFilter = (
  app: ProtectedAppInfo,
  filters: FilterOptions,
  clusterName: string
): boolean => {
  const { searchValue, filterTypes = [] } = filters;

  // No filters applied - show everything
  if (!searchValue && filterTypes.length === 0) {
    return true;
  }

  // Filter types selected but no search value - show all apps
  // (Filter types indicate what to search in, not what to filter out)
  if (!searchValue && filterTypes.length > 0) {
    return true;
  }

  // If no filter types are selected, search across all fields
  if (filterTypes.length === 0 && searchValue) {
    return (
      matchesSearch(app.name, searchValue) ||
      matchesSearch(clusterName, searchValue) ||
      matchesSearch(app.namespace || '', searchValue)
    );
  }

  if (
    filterTypes.includes(FilterType.Cluster) &&
    matchesSearch(clusterName, searchValue)
  ) {
    return true;
  }
  return false;
};

/**
 * Helper to check if a cluster should be shown based on cluster-specific filters
 * Note: This only checks if the cluster itself matches cluster filter
 * Clusters may also be shown if they contain matching apps/operations or are part of policies
 */
const matchesClusterOnlyFilter = (
  clusterName: string,
  filters: FilterOptions,
  clustersInMatchingPolicies: Set<string>
): boolean => {
  if (
    !filters.searchValue &&
    (!filters.filterTypes || filters.filterTypes.length === 0)
  ) {
    return true;
  }

  const searchValue = filters.searchValue || '';
  const filterTypes = filters.filterTypes || [];

  // If policy filter is selected, check if cluster is in a matching policy
  if (
    filterTypes.includes(FilterType.Policy) &&
    clustersInMatchingPolicies.has(clusterName)
  ) {
    return true;
  }

  // If cluster filter is selected, check if cluster name matches
  if (filterTypes.includes(FilterType.Cluster)) {
    return matchesSearch(clusterName, searchValue);
  }

  // If no filter types selected, search across all fields (include cluster)
  if (filterTypes.length === 0 && searchValue) {
    return matchesSearch(clusterName, searchValue);
  }

  // When search is active, do not show clusters that only match unrelated filter types
  if (searchValue) {
    return false;
  }

  return true;
};

/**
 * Generate a topology model from managed clusters, DR policies, protected apps, and active operations
 */
export const generateClusterNodesModel = (
  clusters: ACMManagedClusterKind[],
  clusterPairPoliciesMap?: ClusterPairPoliciesMap | null,
  clusterPairOperationsMap?: ClusterPairOperationsMap | null,
  clusterAppsMap?: ClusterAppsMap | null,
  filters?: FilterOptions
): Model => {
  const isSearchActive = Boolean(filters?.searchValue?.trim());

  // Build a DRPolicy-by-name map for replication health lookups
  const drPolicyByName = new Map<string, DRPolicyKind>();
  const clustersInPolicies = new Set<string>();
  if (clusterPairPoliciesMap) {
    Object.entries(clusterPairPoliciesMap).forEach(
      ([pairKey, policies]: [string, DRPolicyInfo[]]) => {
        const [cluster1, cluster2] = getClustersFromPairKey(pairKey);
        clustersInPolicies.add(cluster1);
        clustersInPolicies.add(cluster2);
        policies.forEach((policyInfo) => {
          if (policyInfo.policy?.metadata?.name) {
            drPolicyByName.set(
              policyInfo.policy.metadata.name,
              policyInfo.policy
            );
          }
        });
      }
    );
  }

  // Build a set of clusters that are in policies matching the current filter
  const clustersInMatchingPolicies = new Set<string>();
  if (clusterPairPoliciesMap && filters) {
    const { filterTypes = [], searchValue = '' } = filters;

    // If there's a search value and policy filter is active (or no specific filter type)
    const shouldFilterPolicies =
      searchValue &&
      (filterTypes.length === 0 || filterTypes.includes(FilterType.Policy));

    if (shouldFilterPolicies) {
      Object.entries(clusterPairPoliciesMap).forEach(([pairKey, policies]) => {
        // Null safety: ensure policies array exists and has at least one policy
        const policyName = policies?.[0]?.name;
        if (!policyName) {
          return; // Skip malformed policy data
        }

        // If policy name matches the search, add its clusters to the set
        if (matchesSearch(policyName, searchValue)) {
          try {
            const [cluster1, cluster2] = getClustersFromPairKey(pairKey);
            // Only add if both clusters are valid
            if (cluster1 && cluster2) {
              clustersInMatchingPolicies.add(cluster1);
              clustersInMatchingPolicies.add(cluster2);
            }
          } catch {
            // Silently skip invalid cluster pair keys
          }
        }
      });
    } else {
      // If not filtering by policy search, all clusters in policies are considered "matching"
      clustersInPolicies.forEach((cluster) =>
        clustersInMatchingPolicies.add(cluster)
      );
    }
  }

  // Build a map of cluster operations (source and target)
  const clusterOperationsMap = new Map<
    string,
    Array<DROperationInfo & { isSource: boolean }>
  >();
  if (clusterPairOperationsMap) {
    Object.values(clusterPairOperationsMap).forEach((operations) => {
      operations.forEach((op) => {
        if (op.sourceCluster) {
          if (!clusterOperationsMap.has(op.sourceCluster)) {
            clusterOperationsMap.set(op.sourceCluster, []);
          }
          clusterOperationsMap
            .get(op.sourceCluster)!
            .push({ ...op, isSource: true });
        }
        if (op.targetCluster) {
          if (!clusterOperationsMap.has(op.targetCluster)) {
            clusterOperationsMap.set(op.targetCluster, []);
          }
          clusterOperationsMap
            .get(op.targetCluster)!
            .push({ ...op, isSource: false });
        }
      });
    });
  }

  // Generate nodes for each cluster (following ODF pattern)
  const allNodes: NodeModel[][] = clusters.map((cluster) => {
    const clusterName = getName(cluster);
    const clusterOperations = clusterOperationsMap.get(clusterName);
    let clusterApps = clusterAppsMap?.[clusterName];

    // Filter apps based on filter criteria
    if (clusterApps && filters) {
      clusterApps = clusterApps.filter((app) =>
        matchesAppFilter(app, filters, clusterName)
      );
    }

    // Filter operations based on their associated apps
    let filteredOperations = clusterOperations;
    if (filteredOperations && filters) {
      filteredOperations = filteredOperations.filter((op) =>
        matchesOperationFilter(op, filters, clusterName)
      );
    }

    // Check if cluster has apps or operations after filtering
    const hasOperations = filteredOperations && filteredOperations.length > 0;
    const hasApps = clusterApps && clusterApps.length > 0;

    if (hasOperations || hasApps) {
      // Cluster has matching apps/operations - always show it
      return generateClusterWithApps(
        cluster,
        clusterApps || [],
        drPolicyByName,
        filteredOperations
      );
    } else {
      // No matching apps/operations after filtering
      // Check if cluster itself matches filter criteria
      const matchesFilter = matchesClusterOnlyFilter(
        clusterName,
        filters || {},
        clustersInMatchingPolicies
      );

      if (!matchesFilter) {
        // Cluster doesn't match and has no matching children
        return [];
      }

      // Cluster matches the filter - show it as standalone
      // Generate simple cluster node
      const id = getUID(cluster);

      // Check cluster health status
      const isHealthy = isClusterHealthy(cluster);

      const node = createNode({
        id,
        type: 'cluster-node',
        label: clusterName,
        labelPosition: LabelPosition.bottom,
        shape: NodeShape.rect,
        resource: cluster,
        kind: ACMManagedClusterModel.kind,
        width: TOPOLOGY_CONSTANTS.NODE_WIDTH,
        height: TOPOLOGY_CONSTANTS.NODE_HEIGHT,
      });

      // Add decorator for health status
      node.data = {
        ...node.data,
        decorators: [
          {
            quadrant: TopologyQuadrant.upperRight,
            icon: isHealthy
              ? DecoratorIcon.CheckCircle
              : DecoratorIcon.ExclamationCircle,
            tooltip: isHealthy ? 'Healthy' : 'Unhealthy',
          },
        ],
      };

      return [node];
    }
  });

  // Flatten nodes (like ODF does with groupedNodes.map().flatten())
  const nodes = allNodes.flat();

  // Build a set of node IDs that actually exist in the final nodes array
  const existingNodeIds = new Set(nodes.map((node) => node.id));

  // Build cluster name to ID map for edge generation
  const clusterNameToUID = new Map<string, string>();
  clusters.forEach((cluster) => {
    const name = getName(cluster);
    const id = getUID(cluster);
    clusterNameToUID.set(name, id);
  });

  // Derive from nodes actually in the model (respects search filtering)
  const clustersWithApps = new Set<string>();
  nodes.forEach((node) => {
    if (node.data?.isClusterGroup && node.id?.startsWith('cluster-group-')) {
      clustersWithApps.add(node.id.replace('cluster-group-', ''));
    }
  });

  // Generate edges and failover nodes
  const edges: EdgeModel[] = [];
  const failoverNodes: NodeModel[] = [];

  // Operation edges reference cluster groups that may be absent after search filtering,
  // which breaks Cola layout (undefined node width). Omit edges/failover while searching.
  if (!isSearchActive && clusterPairOperationsMap) {
    Object.entries(clusterPairOperationsMap).forEach(
      ([pairKey, operations]) => {
        const filteredPairOperations = filters
          ? operations.filter(
              (op) =>
                matchesOperationFilter(op, filters, op.sourceCluster || '') ||
                matchesOperationFilter(op, filters, op.targetCluster || '')
            )
          : operations;

        if (filteredPairOperations.length === 0) return;

        // Group operations by action type
        const operationsByAction = new Map<string, DROperationInfo[]>();
        filteredPairOperations.forEach((op) => {
          if (!operationsByAction.has(op.action)) {
            operationsByAction.set(op.action, []);
          }
          operationsByAction.get(op.action)!.push(op);
        });

        // Create a failover node for each action type
        operationsByAction.forEach((actionOps, action) => {
          const failoverNodeId = `failover-node-${pairKey}-${action}`;
          const count = actionOps.length;

          failoverNodes.push({
            id: failoverNodeId,
            type: 'failover-node',
            label: action,
            labelPosition: LabelPosition.bottom,
            shape: NodeShape.ellipse,
            width: TOPOLOGY_CONSTANTS.FAILOVER_NODE_WIDTH,
            height: TOPOLOGY_CONSTANTS.FAILOVER_NODE_HEIGHT,
            data: {
              operations: actionOps,
              pairKey,
              operationCount: count,
              action,
              showCountDecorator: true,
            },
          });

          // Collect unique source and target clusters for this action
          const sourceClusters = new Set<string>();
          const targetClusters = new Set<string>();
          actionOps.forEach((op) => {
            if (op.sourceCluster) sourceClusters.add(op.sourceCluster);
            if (op.targetCluster) targetClusters.add(op.targetCluster);
          });

          // Create one edge per source cluster -> failover node
          sourceClusters.forEach((sourceCluster) => {
            // Validate cluster is not empty/undefined (defensive check)
            if (!sourceCluster) {
              // eslint-disable-next-line no-console
              console.warn(
                `Operation has undefined source cluster:`,
                actionOps[0]
              );
              return;
            }
            const sourceClusterId = resolveClusterNodeId(
              sourceCluster,
              existingNodeIds,
              clusterNameToUID
            );
            if (sourceClusterId) {
              edges.push({
                id: `edge-source-${pairKey}-${action}-${sourceCluster}`,
                type: 'app-operation-edge',
                source: sourceClusterId,
                target: failoverNodeId,
                data: {
                  operations: actionOps,
                  isOperation: true,
                  pairKey,
                  action,
                },
              });
            }
          });

          // Create one edge per failover node -> target cluster
          targetClusters.forEach((targetCluster) => {
            // Validate cluster is not empty/undefined (defensive check)
            if (!targetCluster) {
              // eslint-disable-next-line no-console
              console.warn(
                `Operation has undefined target cluster:`,
                actionOps[0]
              );
              return;
            }
            const targetClusterId = resolveClusterNodeId(
              targetCluster,
              existingNodeIds,
              clusterNameToUID
            );
            if (targetClusterId) {
              edges.push({
                id: `edge-target-${pairKey}-${action}-${targetCluster}`,
                type: 'app-operation-edge',
                source: failoverNodeId,
                target: targetClusterId,
                data: {
                  operations: actionOps,
                  isOperation: true,
                  pairKey,
                  action,
                },
              });
            }
          });
        });
      }
    );
  }

  // Filter out failover nodes that have no edges (all their apps were filtered out)
  // Optimization: Use Set for O(1) lookup instead of O(n) .some() call
  const nodesWithEdges = new Set<string>();
  edges.forEach((edge) => {
    if (edge.source) nodesWithEdges.add(edge.source as string);
    if (edge.target) nodesWithEdges.add(edge.target as string);
  });
  const failoverNodesWithEdges = failoverNodes.filter((failoverNode) =>
    nodesWithEdges.has(failoverNode.id as string)
  );

  // 2. Create pairing box nodes for DR policies (always show to indicate the underlying DR policy)
  const pairingBoxNodes: NodeModel[] = [];
  if (clusterPairPoliciesMap) {
    Object.entries(clusterPairPoliciesMap).forEach(([pairKey, policies]) => {
      // Filter policies based on search value
      const filterTypes = filters?.filterTypes || [];
      const searchValue = filters?.searchValue || '';

      // If there's a search value, check if policy name matches
      if (searchValue) {
        const policyName = policies[0]?.name || '';
        // Only apply search if policy filter is selected or no specific filter type
        const shouldSearchPolicy =
          filterTypes.length === 0 || filterTypes.includes(FilterType.Policy);
        if (shouldSearchPolicy && !matchesSearch(policyName, searchValue)) {
          return; // Skip this pairing box
        }
      }

      const [cluster1, cluster2] = getClustersFromPairKey(pairKey);

      // Determine node IDs for both clusters
      const cluster1HasApps = clustersWithApps.has(cluster1);
      const cluster2HasApps = clustersWithApps.has(cluster2);

      const cluster1Id = cluster1HasApps
        ? `cluster-group-${cluster1}`
        : clusterNameToUID.get(cluster1);
      const cluster2Id = cluster2HasApps
        ? `cluster-group-${cluster2}`
        : clusterNameToUID.get(cluster2);

      // Only create pairing box if both cluster nodes actually exist in the final nodes array
      if (
        cluster1Id &&
        cluster2Id &&
        existingNodeIds.has(cluster1Id) &&
        existingNodeIds.has(cluster2Id)
      ) {
        // Check if any policy is configuring (not ready)
        const isConfiguring = policies.some((p) => p.isConfiguring);

        const pairingNode: NodeModel = {
          id: `pairing-box-${pairKey}`,
          type: 'pairing-box',
          group: true,
          label: policies[0]?.name || '',
          labelPosition: LabelPosition.bottom,
          children: [cluster1Id, cluster2Id],
          collapsed: false,
          style: {
            padding: TOPOLOGY_CONSTANTS.PAIRING_BOX_PADDING,
          },
          data: {
            policies,
            isConfiguring,
            pairKey,
            isPairingBox: true,
            badge: 'DRP',
            badgeColor: 'var(--pf-t--global--color--brand--default)',
            badgeTextColor:
              'var(--pf-t--global--text--color--on-brand--default)',
            badgeBorderColor: 'var(--pf-t--global--color--brand--default)',
          },
        };
        pairingBoxNodes.push(pairingNode);
      }
    });
  }

  const combinedNodes = [
    ...nodes,
    ...failoverNodesWithEdges,
    ...pairingBoxNodes,
  ];
  const { nodes: sanitizedNodes, edges: sanitizedEdges } =
    sanitizeTopologyModel(combinedNodes, edges);

  return {
    graph: {
      id: 'mco-topology',
      type: 'graph',
      layout: 'Cola',
    },
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  };
};
