import { DRActionType } from '../../../constants';
import { ClusterPairOperationsMap } from '../../../hooks/useActiveDROperations';
import { ClusterPairPoliciesMap } from '../../../hooks/useDRPoliciesByClusterPair';
import {
  ACMManagedClusterKind,
  DRPolicyKind,
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
    phase: 'Available',
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
            phase: 'Available',
            isConfiguring: false,
            schedulingInterval: '5m',
            policy: createMockDRPolicy('dr-policy-1'),
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, policies);

      // Should create pairing box node
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
            phase: 'Configuring',
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
            phase: 'Available',
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
            phase: 'FailingOver',
            progression: Progression.WaitOnUserToCleanUp,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            actionStartTime: new Date().toISOString(),
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, policies, operations);

      // Should still have pairing box to show the policy relationship
      const pairingBox = model.nodes!.find((n) => n.type === 'pairing-box');
      expect(pairingBox).toBeDefined();

      // Should have operation edges for active operations
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
            phase: 'FailingOver',
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

      // Cluster groups should contain app nodes as children
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

    it('should create app-to-app edge for operations', () => {
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
            phase: 'Relocating',
            progression: Progression.Relocating,
            sourceCluster: 'cluster1',
            targetCluster: 'cluster2',
            isDiscoveredApp: false,
          },
        ],
      };

      const model = generateClusterNodesModel(clusters, null, operations);

      // Now creates 2 edges: source -> failover, failover -> target
      expect(model.edges).toHaveLength(2);

      const operationEdges =
        model.edges?.filter((e) => e.type === 'app-operation-edge') || [];
      expect(operationEdges).toHaveLength(2);

      // All edges should be operation edges
      operationEdges.forEach((edge) => {
        expect(edge.data?.isOperation).toBe(true);
        expect(edge.data?.action).toBe(DRActionType.RELOCATE);
      });

      // One edge should go from source app to failover node
      const sourceEdge = operationEdges.find((e) =>
        e.source?.includes('source')
      );
      expect(sourceEdge).toBeDefined();
      expect(sourceEdge?.target).toContain('failover-node');

      // One edge should go from failover node to target app
      const targetEdge = operationEdges.find((e) =>
        e.target?.includes('target')
      );
      expect(targetEdge).toBeDefined();
      expect(targetEdge?.source).toContain('failover-node');
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
            phase: 'FailingOver',
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
            phase: 'Relocating',
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

      // Verify source and target nodes for both operations
      const sourceNodes = appNodes.filter((n) => n.data?.isSource === true);
      const targetNodes = appNodes.filter((n) => n.data?.isSource === false);

      expect(sourceNodes).toHaveLength(2);
      expect(targetNodes).toHaveLength(2);

      // Each should have correct dimensions
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
            phase: 'FailingOver',
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
            phase: 'Relocating',
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
      // 2 operations with different actions = 2 failover nodes
      // Each failover node has 2 edges (source->failover, failover->target)
      // Total = 4 edges
      expect(operationEdges).toHaveLength(4);

      // Verify failover nodes exist for both actions
      const failoverNodes =
        model.nodes?.filter((n) => n.type === 'failover-node') || [];
      expect(failoverNodes).toHaveLength(2);
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
            phase: 'Available',
            isConfiguring: false,
            schedulingInterval: '5m',
            policy: createMockDRPolicy('policy1'),
          },
        ],
        'cluster2::cluster3': [
          {
            name: 'policy2',
            phase: 'Available',
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
            phase: 'FailingOver',
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

      // Should have 2 app-operation edges (source->failover, failover->target)
      expect(model.edges).toHaveLength(2);

      const operationEdges = model.edges?.filter(
        (e) => e.type === 'app-operation-edge'
      );
      expect(operationEdges).toHaveLength(2);

      // Verify pairing boxes exist for both policies
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
