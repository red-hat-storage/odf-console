import { NetworkAttachmentDefinitionKind } from '@odf/shared/types';
import {
  OCS_DEVICE_SET_FLEXIBLE_REPLICA,
  OCS_DEVICE_SET_MINIMUM_REPLICAS,
  TNF_MIN_CPU,
  TNF_MIN_MEMORY_GIB,
} from '../../constants';
import { NetworkType, ResourceProfile } from '../../types';
import { WizardNodeState } from '../create-storage-system/reducer';
import {
  getDeviceSetReplica,
  getOCSRequestData,
  getReplicasFromSelectedNodes,
  isTNFRunnable,
  OCSRequestData,
} from './common';

const tnfNodes = (
  cpuPerNode: number,
  memoryGiBPerNode: number
): WizardNodeState[] =>
  Array.from({ length: 2 }, (_, index) => ({
    name: `node-${index}`,
    hostName: `host-${index}`,
    cpu: String(cpuPerNode),
    memory: `${memoryGiBPerNode}Gi`,
    zone: '',
    rack: '',
    uid: `uid-${index}`,
    roles: ['worker'],
    labels: {},
    taints: [],
    architecture: 'amd64',
  }));

type ReplicasTest = {
  wizardNodeStates: Partial<WizardNodeState>[];
  expectedReplicas: number;
};

describe('ODF common utilities', () => {
  it('getReplicasFromSelectedNodes returns the correct amount of replicas', () => {
    const dataTest: ReplicasTest[] = [
      {
        // No zones, no racks.
        wizardNodeStates: [{}, {}, {}, {}, {}, {}],
        expectedReplicas: OCS_DEVICE_SET_MINIMUM_REPLICAS,
      },
      {
        // 1 zone.
        wizardNodeStates: [{ zone: '1' }, { zone: '1' }],
        expectedReplicas: OCS_DEVICE_SET_MINIMUM_REPLICAS,
      },
      {
        // 1 rack.
        wizardNodeStates: [{ rack: '1' }, { rack: '1' }],
        expectedReplicas: OCS_DEVICE_SET_MINIMUM_REPLICAS,
      },
      {
        // 4 zones.
        wizardNodeStates: [
          { zone: '1' },
          { zone: '2' },
          { zone: '3' },
          { zone: '4' },
        ],
        expectedReplicas: 4,
      },
      {
        // 5 racks, no zones.
        wizardNodeStates: [
          { rack: '1' },
          { rack: '2' },
          { rack: '3' },
          { rack: '4' },
          { rack: '5' },
        ],
        expectedReplicas: 5,
      },
      {
        // 1 zone, racks ignored (this shouldn't happen: we should receive either zones or racks).
        wizardNodeStates: [
          { zone: 'zone1', rack: 'rack1' },
          { zone: 'zone1', rack: 'rack2' },
          { zone: 'zone1', rack: 'rack3' },
          { zone: 'zone1', rack: 'rack4' },
        ],
        expectedReplicas: OCS_DEVICE_SET_MINIMUM_REPLICAS,
      },
    ];
    dataTest.forEach((test) => {
      expect(
        getReplicasFromSelectedNodes(test.wizardNodeStates as WizardNodeState[])
      ).toBe(test.expectedReplicas);
    });
  });

  it('getDeviceSetReplica returns the correct amount of replicas', () => {
    const wizardNodeStates: Partial<WizardNodeState>[] = [
      { zone: '1' },
      { zone: '2' },
      { zone: '3' },
      { zone: '4' },
    ];
    // Stretch cluster.
    expect(
      getDeviceSetReplica(true, false, wizardNodeStates as WizardNodeState[])
    ).toBe(5);

    // Flexible scaling.
    expect(
      getDeviceSetReplica(false, true, wizardNodeStates as WizardNodeState[])
    ).toBe(OCS_DEVICE_SET_FLEXIBLE_REPLICA);

    // Stretch cluster + Flexible scaling.
    expect(
      getDeviceSetReplica(true, true, wizardNodeStates as WizardNodeState[])
    ).toBe(OCS_DEVICE_SET_FLEXIBLE_REPLICA);

    // No stretch cluster, no flexible scaling.
    expect(
      getDeviceSetReplica(false, false, wizardNodeStates as WizardNodeState[])
    ).toBe(4);
  });

  describe('isTNFRunnable', () => {
    const cpuPerNode = 6;
    const memoryPerNode = 24;
    const minAggregateMemoryGiB = TNF_MIN_MEMORY_GIB * 0.97;

    it('returns true when two nodes meet CPU and memory minimums', () => {
      expect(isTNFRunnable(tnfNodes(cpuPerNode, memoryPerNode))).toBe(true);
    });

    it('allows 3% memory leeway for MemTotal under-reporting', () => {
      // 23.4 GiB × 2 = 46.8 GiB (>= 48 × 0.97)
      expect(isTNFRunnable(tnfNodes(cpuPerNode, 23.4))).toBe(true);
    });

    it('returns true at the 3% memory leeway threshold', () => {
      // 23.28 GiB × 2 = 46.56 GiB (= 48 × 0.97)
      expect(isTNFRunnable(tnfNodes(cpuPerNode, 23.28))).toBe(true);
    });

    it('returns false when aggregate memory is just below the 3% leeway', () => {
      // 23.27 GiB × 2 = 46.54 GiB (< 46.56)
      expect(isTNFRunnable(tnfNodes(cpuPerNode, 23.27))).toBe(false);
    });

    it('returns false when aggregate memory is below the 3% leeway', () => {
      // 22 GiB × 2 = 44 GiB (< 46.56)
      expect(isTNFRunnable(tnfNodes(cpuPerNode, 22))).toBe(false);
    });

    it('does not give CPU leeway', () => {
      expect(isTNFRunnable(tnfNodes(cpuPerNode - 0.5, memoryPerNode))).toBe(
        false
      );
    });

    it('requires exactly 12 aggregate CPU with no leeway', () => {
      expect(isTNFRunnable(tnfNodes(5.5, memoryPerNode))).toBe(false);
      expect(isTNFRunnable(tnfNodes(6, memoryPerNode))).toBe(true);
    });

    it('returns false when node count is not exactly two', () => {
      expect(
        isTNFRunnable(tnfNodes(cpuPerNode, memoryPerNode).slice(0, 1))
      ).toBe(false);
      expect(
        isTNFRunnable([
          ...tnfNodes(cpuPerNode, memoryPerNode),
          ...tnfNodes(cpuPerNode, memoryPerNode).slice(0, 1),
        ])
      ).toBe(false);
    });

    it('documents the expected TNF aggregate thresholds', () => {
      expect(TNF_MIN_CPU).toBe(12);
      expect(minAggregateMemoryGiB).toBe(46.56);
    });
  });

  describe('getOCSRequestData TNF network', () => {
    const nad = (
      name: string,
      namespace: string
    ): NetworkAttachmentDefinitionKind =>
      ({
        apiVersion: 'k8s.cni.cncf.io/v1',
        kind: 'NetworkAttachmentDefinition',
        metadata: { name, namespace, uid: `${namespace}/${name}` },
      }) as NetworkAttachmentDefinitionKind;

    const publicNetwork = nad('public-nad', 'openshift-storage');
    const clusterNetwork = nad('cluster-nad', 'openshift-multus');

    const request = (
      isTNFEnabled: boolean,
      networkOverrides: Partial<OCSRequestData['networkConfiguration']> = {}
    ) =>
      getOCSRequestData({
        storageClass: { name: 'localblock', provisioner: 'example.com/test' },
        storage: '1Ti',
        encryption: {
          inTransit: true,
          clusterWide: false,
          storageClass: false,
          advanced: false,
          hasHandled: true,
        },
        resourceProfile: ResourceProfile.Balanced,
        nodes: [],
        flexibleScaling: true,
        networkConfiguration: {
          useClusterNetwork: false,
          publicNetwork,
          clusterNetwork,
          addressRanges: { cluster: [] },
          networkType: NetworkType.MULTUS,
          isMultusAcknowledged: true,
          ...networkOverrides,
        },
        storageClusterNamespace: 'openshift-storage',
        storageClusterName: 'ocs-storagecluster',
        availablePvsCount: 2,
        isTNFEnabled,
      });

    it('submits the cluster network and omits the public network for TNF', () => {
      const spec = request(true).spec;

      expect(spec.flexibleScaling).toBe(true);
      expect(spec.network).toEqual({
        provider: 'multus',
        selectors: {
          cluster: 'openshift-multus/cluster-nad',
        },
        connections: {
          encryption: {
            enabled: true,
          },
        },
      });
      expect(spec.network.selectors).not.toHaveProperty('public');
    });

    it('omits multus selectors when TNF has no cluster network', () => {
      const spec = request(true, { clusterNetwork: null }).spec;

      expect(spec.network).toEqual({
        connections: {
          encryption: {
            enabled: true,
          },
        },
      });
      expect(spec.network).not.toHaveProperty('selectors');
    });

    it('submits both multus selectors when TNF is disabled', () => {
      const selectors = request(false).spec.network.selectors;

      expect(selectors).toEqual({
        public: 'openshift-storage/public-nad',
        cluster: 'openshift-multus/cluster-nad',
      });
    });
  });
});
