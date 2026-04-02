import { ACMManagedClusterModel } from '@odf/shared';
import { getName, getUID } from '@odf/shared/selectors';
import { createNode } from '@odf/shared/topology';
import {
  LabelPosition,
  Model,
  NodeModel,
  NodeShape,
  EdgeModel,
  TopologyQuadrant,
  NodeStatus,
} from '@patternfly/react-topology';
import { ClusterPairOperationsMap } from '../../../hooks/useActiveDROperations';
import {
  ClusterPairPoliciesMap,
  getClustersFromPairKey,
} from '../../../hooks/useDRPoliciesByClusterPair';
import { ClusterAppsMap } from '../../../hooks/useProtectedAppsByCluster';
import { ACMManagedClusterKind, Phase, Progression } from '../../../types';

/**
 * Get decorator configuration based on phase and progression
 * Priority: Failed > User Action Required > Completed > In Progress > Default
 */
const getDecoratorForOperation = (
  phase: string,
  progression?: string,
  action?: string
): {
  icon: string;
  tooltip: string;
  status: NodeStatus;
} => {
  // 1. FAILED STATES - Highest priority (terminal failures)
  if (
    phase === Phase.FailedToFailover ||
    phase === Phase.FailedToRelocate ||
    progression === Progression.FailedToFailover ||
    progression === Progression.FailedToRelocate
  ) {
    return {
      icon: 'exclamation-circle',
      tooltip: `${action || 'Operation'} failed`,
      status: NodeStatus.danger,
    };
  }

  // 2. USER ACTION REQUIRED - Critical waiting states
  if (
    phase === Phase.WaitForUser ||
    progression === Progression.WaitOnUserToCleanUp ||
    progression === Progression.WaitForUserAction
  ) {
    return {
      icon: 'exclamation-triangle',
      tooltip: 'User action required',
      status: NodeStatus.warning,
    };
  }

  // 3. COMPLETED/SUCCESS STATES
  if (
    phase === Phase.FailedOver ||
    phase === Phase.Relocated ||
    phase === Phase.Deployed ||
    progression === Progression.FailedOver ||
    progression === Progression.Completed
  ) {
    return {
      icon: 'check-circle',
      tooltip:
        phase === Phase.FailedOver
          ? 'Failover complete'
          : phase === Phase.Relocated
            ? 'Relocate complete'
            : 'Completed',
      status: NodeStatus.success,
    };
  }

  // 4. IN PROGRESS STATES
  if (
    phase === Phase.FailingOver ||
    phase === Phase.Relocating ||
    phase === Phase.Initiating ||
    phase === Phase.Deploying ||
    progression === Progression.FailingOver ||
    progression === Progression.Relocating ||
    progression === Progression.Deploying
  ) {
    return {
      icon: 'in-progress',
      tooltip: `${phase}...`,
      status: NodeStatus.info,
    };
  }

  // 5. CLEANUP IN PROGRESS
  if (progression === Progression.CleaningUp) {
    return {
      icon: 'in-progress',
      tooltip: 'Cleaning up...',
      status: NodeStatus.info,
    };
  }

  // 6. DEFAULT WARNING (Unknown/Other states)
  return {
    icon: 'exclamation-triangle',
    tooltip: phase || 'Unknown',
    status: NodeStatus.warning,
  };
};

/**
 * Generate app nodes and cluster group for a cluster with apps
 * Following the ODF pattern: generateDeploymentsInNodes
 */
const generateClusterWithApps = (
  cluster: ACMManagedClusterKind,
  apps: any[],
  operations?: any[]
): NodeModel[] => {
  const clusterName = getName(cluster);

  // Create app nodes (children)
  const appNodes: NodeModel[] = [];

  // Track which apps are in operations (by PAV name, not DRPC name)
  const appsInOperations = new Set<string>();

  // Group operations by action type, direction (source/target), and phase
  if (operations && operations.length > 0) {
    // Group operations by action-phase for source cluster
    const sourceOperationsByActionPhase = new Map<string, any[]>();
    // Group operations by action-phase for target cluster
    const targetOperationsByActionPhase = new Map<string, any[]>();

    operations.forEach((op) => {
      // Track by PAV name (same as app.name), not DRPC name
      const pavName = op.pav?.metadata?.name || op.applicationName;
      appsInOperations.add(pavName);

      // Use action-phase as the grouping key
      const phase = op.phase || 'Unknown';
      const groupKey = `${op.action}-${phase}`;

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

    // Create grouped nodes for source operations
    sourceOperationsByActionPhase.forEach((ops, groupKey) => {
      const count = ops.length;
      const action = ops[0].action;
      const phase = ops[0].phase || 'Unknown';
      const progression = ops[0].progression;
      const label =
        count === 1 ? ops[0].applicationName : `Apps in ${action} (${count})`;
      const appId = `app-group-${clusterName}-source-${groupKey}`;

      // Determine decorator based on phase and progression
      const decorator = getDecoratorForOperation(phase, progression, action);
      const decoratorIcon = decorator.icon;
      const decoratorTooltip = decorator.tooltip;
      const decoratorStatus = decorator.status;

      const appNode = createNode({
        id: appId,
        type: 'app-node-operation',
        label,
        labelPosition: LabelPosition.bottom,
        badge: 'APP',
        shape: NodeShape.ellipse,
        showStatusDecorator: false, // We render decorators manually in MCOStyleAppNode
        showDecorators: false,
        resource: ops[0].pav,
        width: 50,
        height: 50,
      } as any);

      (appNode.data as any) = {
        ...(appNode.data || {}),
        operations: ops,
        operation: count === 1 ? ops[0] : undefined,
        isSource: true,
        clusterName,
        isGrouped: count > 1,
        appCount: count,
        action,
        phase,
        decorators: decoratorIcon
          ? [
              {
                quadrant: TopologyQuadrant.upperRight,
                icon: decoratorIcon,
                tooltip: decoratorTooltip,
                status: decoratorStatus,
              },
            ]
          : undefined,
      };
      appNodes.push(appNode);
    });

    // Create grouped nodes for target operations
    targetOperationsByActionPhase.forEach((ops, groupKey) => {
      const count = ops.length;
      const action = ops[0].action;
      const phase = ops[0].phase || 'Unknown';
      const progression = ops[0].progression;
      const label =
        count === 1 ? ops[0].applicationName : `Apps in ${action} (${count})`;
      const appId = `app-group-${clusterName}-target-${groupKey}`;

      // Determine decorator based on phase and progression
      const decorator = getDecoratorForOperation(phase, progression, action);
      const decoratorIcon = decorator.icon;
      const decoratorTooltip = decorator.tooltip;
      const decoratorStatus = decorator.status;

      const appNode = createNode({
        id: appId,
        type: 'app-node-operation',
        label,
        labelPosition: LabelPosition.bottom,
        badge: 'APP',
        shape: NodeShape.ellipse,
        showStatusDecorator: false, // We render decorators manually in MCOStyleAppNode
        showDecorators: false,
        resource: ops[0].pav,
        width: 50,
        height: 50,
      } as any);

      (appNode.data as any) = {
        ...(appNode.data || {}),
        operations: ops,
        operation: count === 1 ? ops[0] : undefined,
        isSource: false,
        clusterName,
        isGrouped: count > 1,
        appCount: count,
        action,
        phase,
        decorators: decoratorIcon
          ? [
              {
                quadrant: TopologyQuadrant.upperRight,
                icon: decoratorIcon,
                tooltip: decoratorTooltip,
                status: decoratorStatus,
              },
            ]
          : undefined,
      };
      appNodes.push(appNode);
    });
  }

  // Group static apps (those not in operations) by their status
  if (apps && apps.length > 0) {
    // Filter out apps that are currently in operations
    const staticApps = apps.filter((app) => !appsInOperations.has(app.name));

    if (staticApps.length > 0) {
      // Group static apps by their status
      const appsByStatus = staticApps.reduce<Record<string, any[]>>(
        (acc, app) => {
          const status = app.status || 'Unknown';
          if (!acc[status]) {
            acc[status] = [];
          }
          acc[status].push(app);
          return acc;
        },
        {}
      );

      // Create one node per status group
      Object.entries(appsByStatus).forEach(
        ([status, groupedApps]: [string, any[]]) => {
          const count = groupedApps.length;
          const firstApp = groupedApps[0];

          // Use first app's name if only one, otherwise show count
          const label = count === 1 ? firstApp.name : `Apps (${count})`;

          // Determine decorator based on status
          let decoratorIcon = '';
          let decoratorTooltip = status;
          let decoratorStatus = NodeStatus.default;

          if (status === 'Critical') {
            decoratorIcon = 'exclamation-circle';
            decoratorTooltip = 'Critical';
            decoratorStatus = NodeStatus.danger;
          } else if (
            status === 'Available' ||
            status === 'FailedOver' ||
            status === 'Relocated'
          ) {
            // FailedOver and Relocated are success states (operation completed successfully)
            decoratorIcon = 'check-circle';
            decoratorTooltip = status;
            decoratorStatus = NodeStatus.success;
          } else if (
            status === 'FailedToFailover' ||
            status === 'FailedToRelocate'
          ) {
            // Failed states should show as errors
            decoratorIcon = 'exclamation-circle';
            decoratorTooltip = status;
            decoratorStatus = NodeStatus.danger;
          }

          const appNode = createNode({
            id: `app-group-${clusterName}-${status}`,
            type: 'app-node-operation',
            label,
            labelPosition: LabelPosition.bottom,
            badge: 'APP',
            shape: NodeShape.ellipse,
            showStatusDecorator: false, // We render decorators manually in MCOStyleAppNode
            showDecorators: false,
            resource: firstApp.pav,
            width: 50,
            height: 50,
          } as any);

          (appNode.data as any) = {
            ...(appNode.data || {}),
            appInfo: count === 1 ? firstApp : undefined,
            apps: groupedApps, // Store all apps in the group
            appCount: count,
            appStatus: status,
            clusterName,
            isStatic: true,
            isGrouped: count > 1,
            decorators: decoratorIcon
              ? [
                  {
                    quadrant: TopologyQuadrant.upperLeft,
                    icon: decoratorIcon,
                    tooltip: decoratorTooltip,
                    status: decoratorStatus,
                  },
                ]
              : undefined,
          };
          appNodes.push(appNode);
        }
      );
    }
  }

  // Check cluster health status
  const conditions = (cluster as any)?.status?.conditions || [];
  const isHealthy = conditions.find(
    (c: any) =>
      c.type === 'ManagedClusterConditionAvailable' && c.status === 'True'
  );

  // Create cluster group (parent)
  const group: NodeModel = {
    id: `cluster-group-${clusterName}`,
    type: 'group',
    group: true,
    label: clusterName,
    labelPosition: LabelPosition.bottom,
    children: appNodes.map((n) => n.id),
    style: { padding: 30 },
    collapsed: false,
    data: {
      isClusterGroup: true,
      resource: cluster,
      kind: ACMManagedClusterModel.kind,
      badge: ACMManagedClusterModel.abbr || 'CL',
      showStatusDecorator: false, // We render decorators manually in MCOStyleAppGroup
      collapsible: false,
      canDropOnNode: false,
      decorators: [
        {
          quadrant: TopologyQuadrant.upperRight,
          icon: isHealthy ? 'check-circle' : 'exclamation-circle',
          tooltip: isHealthy ? 'Healthy' : 'Unhealthy',
        },
      ],
    },
  };

  // Return children first, then parent (ODF pattern)
  return [...appNodes, group];
};

/**
 * Generate a topology model from managed clusters, DR policies, protected apps, and active operations
 */
export const generateClusterNodesModel = (
  clusters: ACMManagedClusterKind[],
  clusterPairPoliciesMap?: ClusterPairPoliciesMap | null,
  clusterPairOperationsMap?: ClusterPairOperationsMap | null,
  clusterAppsMap?: ClusterAppsMap | null
): Model => {
  // Build a map of cluster operations (source and target)
  const clusterOperationsMap = new Map<string, any[]>();
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
    const clusterApps = clusterAppsMap?.[clusterName];

    // Check if cluster has apps or operations
    const hasOperations = clusterOperations && clusterOperations.length > 0;
    const hasApps = clusterApps && clusterApps.length > 0;

    if (hasOperations || hasApps) {
      // Generate cluster group with apps (like generateDeploymentsInNodes)
      return generateClusterWithApps(
        cluster,
        clusterApps || [],
        clusterOperations
      );
    } else {
      // Generate simple cluster node
      const id = getUID(cluster);

      // Check cluster health status
      const conditions = (cluster as any)?.status?.conditions || [];
      const isHealthy = conditions.find(
        (c: any) =>
          c.type === 'ManagedClusterConditionAvailable' && c.status === 'True'
      );

      const node = createNode({
        id,
        type: 'cluster-node',
        label: clusterName,
        labelPosition: LabelPosition.bottom,
        badge: ACMManagedClusterModel.abbr || 'CL',
        shape: NodeShape.rect,
        showStatusDecorator: false, // We render decorators manually in MCOStyleNode
        resource: cluster,
        kind: ACMManagedClusterModel.kind,
        width: 75,
        height: 75,
      });

      // Add decorator for health status
      node.data = {
        ...node.data,
        decorators: [
          {
            quadrant: TopologyQuadrant.upperRight,
            icon: isHealthy ? 'check-circle' : 'exclamation-circle',
            tooltip: isHealthy ? 'Healthy' : 'Unhealthy',
          },
        ],
      };

      return [node];
    }
  });

  // Flatten nodes (like ODF does with groupedNodes.map().flatten())
  const nodes = allNodes.flat();

  // Build cluster name to ID map for edge generation
  const clusterNameToUID = new Map<string, string>();
  const clustersWithApps = new Set<string>();
  clusters.forEach((cluster) => {
    const name = getName(cluster);
    const id = getUID(cluster);
    clusterNameToUID.set(name, id);

    if (clusterOperationsMap.has(name) || clusterAppsMap?.[name]?.length > 0) {
      clustersWithApps.add(name);
    }
  });

  // Generate edges and failover nodes
  const edges: EdgeModel[] = [];
  const failoverNodes: NodeModel[] = [];

  // 1. Create failover nodes and edges for active operations
  if (clusterPairOperationsMap) {
    Object.entries(clusterPairOperationsMap).forEach(
      ([pairKey, operations]) => {
        if (operations.length === 0) return;

        // Group operations by action type
        const operationsByAction = new Map<string, any[]>();
        operations.forEach((op) => {
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
            width: 60,
            height: 60,
            data: {
              operations: actionOps,
              pairKey,
              operationCount: count,
              action,
              showCountDecorator: true,
            },
          });

          // Group actionOps by phase for source and target
          const sourceOpsByPhase = new Map<string, any[]>();
          const targetOpsByPhase = new Map<string, any[]>();

          actionOps.forEach((op) => {
            const phase = op.phase || 'Unknown';
            const groupKey = `${action}-${phase}`;

            if (!sourceOpsByPhase.has(groupKey)) {
              sourceOpsByPhase.set(groupKey, []);
            }
            sourceOpsByPhase.get(groupKey)!.push(op);

            if (!targetOpsByPhase.has(groupKey)) {
              targetOpsByPhase.set(groupKey, []);
            }
            targetOpsByPhase.get(groupKey)!.push(op);
          });

          // Create edges from each source app group to failover node
          sourceOpsByPhase.forEach((ops, groupKey) => {
            const sourceAppId = `app-group-${ops[0].sourceCluster}-source-${groupKey}`;

            edges.push({
              id: `edge-source-${pairKey}-${groupKey}`,
              type: 'app-operation-edge',
              source: sourceAppId,
              target: failoverNodeId,
              data: {
                operations: ops,
                isOperation: true,
                pairKey,
                action,
              },
            });
          });

          // Create edges from failover node to each target app group
          targetOpsByPhase.forEach((ops, groupKey) => {
            const targetAppId = `app-group-${ops[0].targetCluster}-target-${groupKey}`;

            edges.push({
              id: `edge-target-${pairKey}-${groupKey}`,
              type: 'app-operation-edge',
              source: failoverNodeId,
              target: targetAppId,
              data: {
                operations: ops,
                isOperation: true,
                pairKey,
                action,
              },
            });
          });
        });
      }
    );
  }

  // 2. Create pairing box nodes for DR policies (always show to indicate the underlying DR policy)
  const pairingBoxNodes: NodeModel[] = [];
  if (clusterPairPoliciesMap) {
    Object.entries(clusterPairPoliciesMap).forEach(([pairKey, policies]) => {
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

      // Only create pairing box if both clusters are in the topology
      if (cluster1Id && cluster2Id) {
        // Check if any policy is configuring (not ready)
        const isConfiguring = policies.some((p) => p.isConfiguring);

        const pairingNode: NodeModel = {
          id: `pairing-box-${pairKey}`,
          type: 'pairing-box',
          group: true,
          label: policies[0]?.name || '',
          labelPosition: LabelPosition.bottom,
          children: [cluster1Id, cluster2Id], // Let layout manager handle the grouping
          collapsed: false,
          style: {
            padding: 40, // Padding around the children
          },
          data: {
            policies,
            isConfiguring,
            pairKey,
            isPairingBox: true,
            badge: 'DRP',
            badgeColor: '#06c',
            badgeTextColor: '#ffffff',
            badgeBorderColor: '#06c',
            showStatusDecorator: false,
          },
        };
        pairingBoxNodes.push(pairingNode);
      }
    });
  }

  return {
    graph: {
      id: 'mco-topology',
      type: 'graph',
      layout: 'Cola',
    },
    nodes: [...nodes, ...failoverNodes, ...pairingBoxNodes], // Cluster nodes FIRST, then failover nodes, then pairing boxes
    edges,
  };
};
