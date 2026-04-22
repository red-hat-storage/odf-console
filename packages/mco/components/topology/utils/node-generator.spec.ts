import { DRActionType } from '../../../constants';
import { ClusterPairOperationsMap } from '../../../hooks/useActiveDROperations';
import { ClusterPairPoliciesMap } from '../../../hooks/useDRPoliciesByClusterPair';
import {
  ACMManagedClusterKind,
  DRPolicyKind,
  Phase,
  Progression,
} from '../../../types';
import { generateClusterNodesModel } from './node-generator';

// Mock data helpers
const createMockCluster = (
  name: string,
  uid: string
): ACMManagedClusterKind => ({
  apiVersion: 'cluster.open-cluster-management.io/v1',
  kind: 'ManagedCluster',
  metadata: {
    name,
    uid,
  },
  status: {},
});

const createMockDRPolicy = (name: string): DRPolicyKind => ({
  apiVersion: 'ramendr.openshift.io/v1alpha1',
  kind: 'DRPolicy',
  metadata: { name },
  spec: {
    drClusters: [],
    schedulingInterval: '5m',
  },
  status: {
    phase: '',
    conditions: [
      { type: 'Validated', status: 'True', lastTransitionTime: '', reason: '' },
    ],
  },
});

describe('generateClusterNodesModel', () => {
  describe('Cluster Nodes', () => {
    it('should generate cluster nodes when no apps present', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const model = generateClusterNodesModel(clusters, null, null, null);

      expect(model.nodes).toHaveLength(2);
      expect(model.nodes?.[0]?.id).toBe('uid-1');
      expect(model.nodes?.[1]?.id).toBe('uid-2');
      expect(model.nodes?.[0]?.type).toBe('cluster-node');
    });

    it('should create cluster nodes with proper dimensions', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
        createMockCluster('cluster3', 'uid-3'),
      ];

      const model = generateClusterNodesModel(clusters, null, null, null);

      expect(model.nodes?.[0]?.width).toBe(75);
      expect(model.nodes?.[0]?.height).toBe(75);
      expect(model.nodes?.[1]?.width).toBe(75);
      expect(model.nodes?.[2]?.width).toBe(75);
    });

    it('should handle empty cluster list', () => {
      const model = generateClusterNodesModel([], null, null, null);

      expect(model.nodes).toHaveLength(0);
      expect(model.edges).toHaveLength(0);
    });
  });

  describe('DR Policy Pairing Boxes', () => {
    it('should create pairing box for paired clusters', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const policies: ClusterPairPoliciesMap = {
        'cluster1::cluster2': [
          {
            name: 'dr-policy-1',
            phase: 'Validated',
            isConfiguring: false,
            schedulingInterval: '5m',
            policy: createMockDRPolicy('dr-policy-1'),
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, policies);

      const pairingBox = model.nodes!.find(
        (n) =>
          n.type === 'pairing-box' && n.id === 'pairing-box-cluster1::cluster2'
      );
      expect(pairingBox).toBeDefined();
      expect(pairingBox!.children).toContain('uid-1');
      expect(pairingBox!.children).toContain('uid-2');
      expect(pairingBox!.data.isConfiguring).toBe(false);
    });

    it('should mark pairing box as configuring when policy is configuring', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const policies: ClusterPairPoliciesMap = {
        'cluster1::cluster2': [
          {
            name: 'dr-policy-1',
            phase: 'Not validated',
            isConfiguring: true,
            schedulingInterval: '5m',
            policy: createMockDRPolicy('dr-policy-1'),
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, policies);

      const pairingBox = model.nodes!.find((n) => n.type === 'pairing-box');
      expect(pairingBox!.data.isConfiguring).toBe(true);
    });

    it('should still create pairing box when active operations exist', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const policies: ClusterPairPoliciesMap = {
        'cluster1::cluster2': [
          {
            name: 'dr-policy-1',
            phase: 'Validated',
            isConfiguring: false,
            schedulingInterval: '5m',
            policy: createMockDRPolicy('dr-policy-1'),
          },
        ],
      };

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailingOver,
            progression: Progression.FailingOver,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            actionStartTime: new Date().toISOString(),
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, policies, operations);

      const pairingBox = model.nodes!.find((n) => n.type === 'pairing-box');
      expect(pairingBox).toBeDefined();

      const operationEdges =
        model.edges?.filter((e) => e.type === 'app-operation-edge') || [];
      expect(operationEdges.length).toBeGreaterThan(0);
    });
  });

  describe('Application Nodes and Operation Edges', () => {
    it('should create source and target app nodes for active operations', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailingOver,
            progression: Progression.FailingOver,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      // Should have 2 cluster groups + 2 app nodes + 1 failover node
      expect(model.nodes).toHaveLength(5);

      const appNodes =
        model.nodes?.filter((n) => n.type === 'app-node-operation') || [];
      expect(appNodes).toHaveLength(2);

      const clusterGroups =
        model.nodes?.filter(
          (n) => n.type === 'group' && n.data?.isClusterGroup
        ) || [];
      expect(clusterGroups).toHaveLength(2);

      const failoverNodes =
        model.nodes?.filter((n) => n.type === 'failover-node') || [];
      expect(failoverNodes).toHaveLength(1);

      clusterGroups.forEach((group) => {
        expect(group.children?.length).toBeGreaterThan(0);
      });

      const sourceNode = appNodes.find((n) => n.data?.isSource === true);
      const targetNode = appNodes.find((n) => n.data?.isSource === false);

      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();
      expect(sourceNode?.data?.clusterName).toBe('cluster1');
      expect(targetNode?.data?.clusterName).toBe('cluster2');
    });

    it('should create cluster-to-cluster edges for operations', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.RELOCATE,
            phase: Phase.Relocating,
            progression: Progression.Relocating,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      // 2 edges: source cluster -> failover, failover -> target cluster
      expect(model.edges).toHaveLength(2);

      const operationEdges =
        model.edges?.filter((e) => e.type === 'app-operation-edge') || [];
      expect(operationEdges).toHaveLength(2);

      operationEdges.forEach((edge) => {
        expect(edge.data?.isOperation).toBe(true);
        expect(edge.data?.action).toBe(DRActionType.RELOCATE);
      });

      // Source edge: cluster-group -> failover-node
      const sourceEdge = operationEdges.find((e) =>
        e.id.includes('edge-source')
      );
      expect(sourceEdge).toBeDefined();
      expect(sourceEdge?.source).toBe('cluster-group-cluster1');
      expect(sourceEdge?.target).toContain('failover-node');

      // Target edge: failover-node -> cluster-group
      const targetEdge = operationEdges.find((e) =>
        e.id.includes('edge-target')
      );
      expect(targetEdge).toBeDefined();
      expect(targetEdge?.source).toContain('failover-node');
      expect(targetEdge?.target).toBe('cluster-group-cluster2');
    });

    it('should create edges referencing cluster groups not app groups', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('clusterA', 'uid-a'),
        createMockCluster('clusterB', 'uid-b'),
      ];

      const operations: ClusterPairOperationsMap = {
        'clusterA::clusterB': [
          {
            drpcName: 'drpc-1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailingOver,
            progression: Progression.FailingOver,
            sourceCluster: 'clusterA',
            targetCluster: 'clusterB',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const edges = model.edges || [];
      edges.forEach((edge) => {
        // No edge should reference app-group nodes
        expect(edge.source).not.toContain('app-group');
        expect(edge.target).not.toContain('app-group');
        // Edges should only connect cluster-group or failover-node
        const isClusterOrFailover = (id: string) =>
          id.startsWith('cluster-group-') || id.startsWith('failover-node-');
        expect(isClusterOrFailover(edge.source!)).toBe(true);
        expect(isClusterOrFailover(edge.target!)).toBe(true);
      });
    });

    it('should create multiple app nodes for each operation', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailingOver,
            progression: Progression.FailingOver,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
          {
            drpcName: 'drpc-app2',
            applicationName: 'app2',
            applicationNamespace: 'ns2',
            action: DRActionType.RELOCATE,
            phase: Phase.Relocating,
            progression: Progression.Relocating,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const appNodes =
        model.nodes?.filter((n) => n.type === 'app-node-operation') || [];
      // 2 operations with different action-phase combinations = 4 app nodes (2 source + 2 target)
      expect(appNodes).toHaveLength(4);

      const sourceNodes = appNodes.filter((n) => n.data?.isSource === true);
      const targetNodes = appNodes.filter((n) => n.data?.isSource === false);

      expect(sourceNodes).toHaveLength(2);
      expect(targetNodes).toHaveLength(2);

      sourceNodes.forEach((node) => {
        expect(node.width).toBe(50);
        expect(node.height).toBe(50);
      });
    });

    it('should create edges for all active operations', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailingOver,
            progression: Progression.FailingOver,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
          {
            drpcName: 'drpc-app2',
            applicationName: 'app2',
            applicationNamespace: 'ns2',
            action: DRActionType.RELOCATE,
            phase: Phase.Relocating,
            progression: Progression.Relocating,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const operationEdges =
        model.edges?.filter((e) => e.type === 'app-operation-edge') || [];
      // 2 actions x 2 edges each (source cluster->failover, failover->target cluster) = 4
      expect(operationEdges).toHaveLength(4);

      const failoverNodes =
        model.nodes?.filter((n) => n.type === 'failover-node') || [];
      expect(failoverNodes).toHaveLength(2);
    });

    it('should carry all operations for the action in edge data', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailingOver,
            progression: Progression.FailingOver,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
          {
            drpcName: 'drpc-app2',
            applicationName: 'app2',
            applicationNamespace: 'ns2',
            action: DRActionType.FAILOVER,
            phase: Phase.FailingOver,
            progression: Progression.FailingOver,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const edges =
        model.edges?.filter((e) => e.type === 'app-operation-edge') || [];
      // Both edges should carry all 2 operations for the action
      edges.forEach((edge) => {
        expect(edge.data?.operations).toHaveLength(2);
      });
    });
  });

  describe('Effective DR Status and Progression', () => {
    it('should use effective status for node labels when progression overrides phase', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailedOver,
            progression: Progression.WaitOnUserToCleanUp,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const appNodes =
        model.nodes?.filter((n) => n.type === 'app-node-operation') || [];
      // Labels should show WaitOnUserToCleanUp, not FailedOver
      appNodes.forEach((node) => {
        expect(node.label).toBe('WaitOnUserToCleanUp');
      });
    });

    it('should pass progression data to operation app nodes', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailedOver,
            progression: Progression.WaitOnUserToCleanUp,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const appNodes =
        model.nodes?.filter((n) => n.type === 'app-node-operation') || [];
      appNodes.forEach((node) => {
        expect(node.data?.progression).toBe(Progression.WaitOnUserToCleanUp);
        expect(node.data?.phase).toBe(Phase.FailedOver);
      });
    });

    it('should group operations by effective status not raw phase', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
      ];

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailedOver,
            progression: Progression.WaitOnUserToCleanUp,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
          {
            drpcName: 'drpc-app2',
            applicationName: 'app2',
            applicationNamespace: 'ns2',
            action: DRActionType.FAILOVER,
            phase: Phase.FailedOver,
            progression: Progression.Completed,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const appNodes =
        model.nodes?.filter((n) => n.type === 'app-node-operation') || [];
      // Same phase (FailedOver) but different effective statuses
      // (WaitOnUserToCleanUp vs FailedOver) should produce separate node groups.
      // 2 effective statuses x 2 (source + target) = 4 app nodes
      expect(appNodes).toHaveLength(4);

      const labels = appNodes.map((n) => n.label);
      expect(labels).toContain('WaitOnUserToCleanUp');
      expect(labels).toContain('FailedOver');
    });
  });

  describe('Post-Failover WaitOnUserToCleanUp (bug regression)', () => {
    it('should create edges between different clusters when source != target', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('dr1-cluster', 'uid-dr1'),
        createMockCluster('local-cluster', 'uid-local'),
      ];

      // After failover completes: phase=FailedOver, progression=WaitOnUserToCleanUp
      // Source should be preferredCluster (dr1-cluster), target should be failoverCluster (local-cluster)
      const operations: ClusterPairOperationsMap = {
        'dr1-cluster::local-cluster': [
          {
            drpcName: 'protection-drpc',
            applicationName: 'protection-drpc',
            applicationNamespace: 'openshift-dr-ops',
            action: DRActionType.FAILOVER,
            phase: Phase.FailedOver,
            progression: Progression.WaitOnUserToCleanUp,
            sourceCluster: 'dr1-cluster',
            targetCluster: 'local-cluster',
            actionStartTime: '2026-04-21T06:59:47Z',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const edges =
        model.edges?.filter((e) => e.type === 'app-operation-edge') || [];
      expect(edges).toHaveLength(2);

      const sourceEdge = edges.find((e) => e.id.includes('edge-source'));
      const targetEdge = edges.find((e) => e.id.includes('edge-target'));

      // Source edge should originate from dr1-cluster's group
      expect(sourceEdge?.source).toBe('cluster-group-dr1-cluster');
      // Target edge should point to local-cluster's group
      expect(targetEdge?.target).toBe('cluster-group-local-cluster');
      // They should NOT be the same cluster
      expect(sourceEdge?.source).not.toBe(targetEdge?.target);
    });

    it('should not create duplicate app nodes in the same cluster', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('dr1-cluster', 'uid-dr1'),
        createMockCluster('local-cluster', 'uid-local'),
      ];

      const operations: ClusterPairOperationsMap = {
        'dr1-cluster::local-cluster': [
          {
            drpcName: 'protection-drpc',
            applicationName: 'protection-drpc',
            applicationNamespace: 'openshift-dr-ops',
            action: DRActionType.FAILOVER,
            phase: Phase.FailedOver,
            progression: Progression.WaitOnUserToCleanUp,
            sourceCluster: 'dr1-cluster',
            targetCluster: 'local-cluster',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const appNodes =
        model.nodes?.filter((n) => n.type === 'app-node-operation') || [];
      // Should be 2 app nodes: 1 source in dr1-cluster, 1 target in local-cluster
      expect(appNodes).toHaveLength(2);

      const clusterGroups =
        model.nodes?.filter(
          (n) => n.type === 'group' && n.data?.isClusterGroup
        ) || [];
      // Each cluster group should have exactly 1 child app node
      clusterGroups.forEach((group) => {
        expect(group.children).toHaveLength(1);
      });
    });

    it('should set failover node label to action and carry correct operation data', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('dr1-cluster', 'uid-dr1'),
        createMockCluster('local-cluster', 'uid-local'),
      ];

      const operations: ClusterPairOperationsMap = {
        'dr1-cluster::local-cluster': [
          {
            drpcName: 'protection-drpc',
            applicationName: 'protection-drpc',
            applicationNamespace: 'openshift-dr-ops',
            action: DRActionType.FAILOVER,
            phase: Phase.FailedOver,
            progression: Progression.WaitOnUserToCleanUp,
            sourceCluster: 'dr1-cluster',
            targetCluster: 'local-cluster',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      const failoverNode = model.nodes?.find((n) => n.type === 'failover-node');
      expect(failoverNode).toBeDefined();
      expect(failoverNode?.label).toBe(DRActionType.FAILOVER);
      expect(failoverNode?.data?.operationCount).toBe(1);
      expect(failoverNode?.data?.operations).toHaveLength(1);
      expect(failoverNode?.data?.operations[0].progression).toBe(
        Progression.WaitOnUserToCleanUp
      );
    });
  });

  describe('Mixed Scenarios', () => {
    it('should handle multiple cluster pairs with different states', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
        createMockCluster('cluster2', 'uid-2'),
        createMockCluster('cluster3', 'uid-3'),
      ];

      const policies: ClusterPairPoliciesMap = {
        'cluster1::cluster2': [
          {
            name: 'policy1',
            phase: 'Validated',
            isConfiguring: false,
            schedulingInterval: '5m',
            policy: createMockDRPolicy('policy1'),
          },
        ],
        'cluster2::cluster3': [
          {
            name: 'policy2',
            phase: 'Validated',
            isConfiguring: false,
            schedulingInterval: '5m',
            policy: createMockDRPolicy('policy2'),
          },
        ],
      };

      const operations: ClusterPairOperationsMap = {
        'cluster1::cluster2': [
          {
            drpcName: 'drpc-app1',
            applicationName: 'app1',
            applicationNamespace: 'ns1',
            action: DRActionType.FAILOVER,
            phase: Phase.FailingOver,
            progression: Progression.FailingOver,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, policies, operations);

      // Expected nodes:
      // - 2 app nodes (source and target for operation)
      // - 2 cluster groups (cluster1 and cluster2 with apps)
      // - 1 standalone cluster node (cluster3)
      // - 1 failover node
      // - 2 pairing boxes (cluster1-cluster2 and cluster2-cluster3)
      // Total = 8 nodes
      expect(model.nodes).toHaveLength(8);

      // Should have 2 app-operation edges (source cluster->failover, failover->target cluster)
      expect(model.edges).toHaveLength(2);

      const operationEdges = model.edges?.filter(
        (e) => e.type === 'app-operation-edge'
      );
      expect(operationEdges).toHaveLength(2);

      const pairingBoxes = model.nodes?.filter((n) => n.type === 'pairing-box');
      expect(pairingBoxes).toHaveLength(2);
    });

    it('should return valid topology model structure', () => {
      const clusters: ACMManagedClusterKind[] = [
        createMockCluster('cluster1', 'uid-1'),
      ];

      const model = generateClusterNodesModel(clusters);

      expect(model).toHaveProperty('graph');
      expect(model).toHaveProperty('nodes');
      expect(model).toHaveProperty('edges');
      expect(model.graph!.id).toBe('mco-topology');
      expect(model.graph!.type).toBe('graph');
      expect(model.graph!.layout).toBe('Cola');
    });
  });
});
