import { GlobalnetStatus, SubmarinerStatus } from '@odf/mco/constants';
import type {
  ManagedClusterNetworkInfo,
  SubmarinerAddOnKind,
  SubmarinerBrokerKind,
  SubmarinerClusterKind,
} from '@odf/mco/types';
import {
  doesGlobalnetBlockProceed,
  evaluateGlobalnetPrePair,
  evaluateSubmarinerPrePair,
} from './submariner-health';

const notFoundError = { response: { status: 404 } };

const addonWithConditions = (
  conditions: Array<{ type: string; status: string }>
): SubmarinerAddOnKind =>
  ({
    metadata: { name: 'submariner' },
    status: { conditions },
  }) as SubmarinerAddOnKind;

const healthyAddon = () =>
  addonWithConditions([
    { type: 'Available', status: 'True' },
    { type: 'SubmarinerConnectionDegraded', status: 'False' },
  ]);

const healthyAddonLegacy = () =>
  addonWithConditions([
    { type: 'SubmarinerAgentAvailable', status: 'True' },
    { type: 'SubmarinerConnectionDegraded', status: 'False' },
  ]);

const progressingAddon = () =>
  addonWithConditions([{ type: 'Available', status: 'False' }]);

const degradedAddon = () =>
  addonWithConditions([
    { type: 'Available', status: 'True' },
    { type: 'SubmarinerConnectionDegraded', status: 'True' },
  ]);

const cluster = (
  addon: SubmarinerAddOnKind | undefined,
  loaded = true,
  loadError: unknown = null
) => ({ addon, loaded, loadError });

describe('evaluateSubmarinerPrePair', () => {
  it('reports Healthy when both addons are available and not connection-degraded', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(healthyAddon()),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: true, status: SubmarinerStatus.Healthy });
  });

  it('reports Healthy for legacy SubmarinerAgentAvailable condition type', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(healthyAddonLegacy()),
        cluster(healthyAddonLegacy()),
      ])
    ).toEqual({ canProceed: true, status: SubmarinerStatus.Healthy });
  });

  it('reports NotInstalled when both watches are 404 or addons are missing', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(undefined, true, notFoundError),
        cluster(undefined),
      ])
    ).toEqual({ canProceed: true, status: SubmarinerStatus.NotInstalled });
  });

  it('reports Progressing while Available is False', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(progressingAddon()),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Progressing });
  });

  it('keeps a Progressing cluster blocking when its peer is Unknown', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(progressingAddon()),
        cluster(addonWithConditions([{ type: 'Available', status: 'True' }])),
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Progressing });
  });

  it('reports Unknown without blocking when Available is True but ConnectionDegraded is absent', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(addonWithConditions([{ type: 'Available', status: 'True' }])),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: true, status: SubmarinerStatus.Unknown });
  });

  it('reports Unknown without blocking when Available condition is missing', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(
          addonWithConditions([
            { type: 'SubmarinerConnectionDegraded', status: 'False' },
          ])
        ),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: true, status: SubmarinerStatus.Unknown });
  });

  it('reports Degraded when ConnectionDegraded is True', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(degradedAddon()),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Degraded });
  });

  it('reports Degraded when ConnectionDegraded is True even if Available is False', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(
          addonWithConditions([
            { type: 'Available', status: 'False' },
            { type: 'SubmarinerConnectionDegraded', status: 'True' },
          ])
        ),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Degraded });
  });

  it('reports GatewayNodesUnlabeled when gateway nodes are not labeled', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(
          addonWithConditions([
            { type: 'Available', status: 'True' },
            { type: 'SubmarinerConnectionDegraded', status: 'False' },
            { type: 'SubmarinerGatewayNodesLabeled', status: 'False' },
          ])
        ),
        cluster(healthyAddon()),
      ])
    ).toEqual({
      canProceed: false,
      status: SubmarinerStatus.GatewayNodesUnlabeled,
    });
  });

  it('reports Inconsistent when only one cluster has Submariner', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(healthyAddon()),
        cluster(undefined, true, notFoundError),
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Inconsistent });
  });
});

const claim = (clusterNetwork: string[], serviceNetwork: string[]) =>
  JSON.stringify({ clusterNetwork, serviceNetwork });

const loadedCluster = (name: string, value: string) => ({
  clusterName: name,
  loaded: true,
  clusterClaims: [{ name: 'network.openshift.io', value }],
});

const broker = (globalnetEnabled: boolean): SubmarinerBrokerKind[] => [
  {
    metadata: { name: 'submariner-broker' },
    spec: { globalnetEnabled },
  },
];

const evalGlobalnet = ({
  brokers,
  brokersLoaded = true,
  brokersError = null,
  clusters,
  submarinerClusters,
  submarinerClustersLoaded = true,
  skip = false,
}: {
  brokers?: SubmarinerBrokerKind[];
  brokersLoaded?: boolean;
  brokersError?: unknown;
  clusters: ManagedClusterNetworkInfo[];
  submarinerClusters?: SubmarinerClusterKind[];
  submarinerClustersLoaded?: boolean;
  skip?: boolean;
}) =>
  evaluateGlobalnetPrePair(
    brokers,
    brokersLoaded,
    brokersError,
    clusters,
    submarinerClusters,
    submarinerClustersLoaded,
    skip
  );

describe('evaluateGlobalnetPrePair', () => {
  it('blocks when CIDR overlap cannot be determined', () => {
    expect(
      evalGlobalnet({
        brokers: broker(false),
        clusters: [
          loadedCluster('a', claim(['10.128.0.0/14'], ['172.30.0.0/16'])),
          { clusterName: 'b', loaded: true },
        ],
      })
    ).toBe(GlobalnetStatus.CidrUnread);

    expect(
      evalGlobalnet({
        brokers: broker(false),
        clusters: [
          loadedCluster('a', claim(['not-a-cidr'], ['172.30.0.0/16'])),
          loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
        ],
      })
    ).toBe(GlobalnetStatus.CidrUnread);

    expect(doesGlobalnetBlockProceed(GlobalnetStatus.CidrUnread)).toBe(true);
  });

  it('blocks with LoadError when Broker watch fails', () => {
    expect(
      evalGlobalnet({
        brokersError: new Error('forbidden'),
        clusters: [
          loadedCluster('a', claim(['10.128.0.0/14'], ['172.30.0.0/16'])),
          loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
        ],
      })
    ).toBe(GlobalnetStatus.LoadError);
    expect(doesGlobalnetBlockProceed(GlobalnetStatus.LoadError)).toBe(true);
  });

  it('blocks when CIDRs overlap and Globalnet is off or missing', () => {
    const same = claim(['10.128.0.0/14'], ['172.30.0.0/16']);
    const clusters = [loadedCluster('a', same), loadedCluster('b', same)];

    expect(
      evalGlobalnet({
        brokers: broker(false),
        clusters,
      })
    ).toBe(GlobalnetStatus.OverlapGlobalnetOff);
    expect(evalGlobalnet({ brokers: [], clusters })).toBe(
      GlobalnetStatus.OverlapBrokerMissing
    );
    expect(doesGlobalnetBlockProceed(GlobalnetStatus.OverlapGlobalnetOff)).toBe(
      true
    );
  });

  it('allows and reports status when there is no overlap', () => {
    const clusters = [
      loadedCluster('a', claim(['10.128.0.0/14'], ['172.30.0.0/16'])),
      loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
    ];

    expect(
      evalGlobalnet({
        brokers: broker(true),
        clusters,
      })
    ).toBe(GlobalnetStatus.Enabled);
    expect(
      evalGlobalnet({
        brokers: broker(false),
        clusters,
      })
    ).toBe(GlobalnetStatus.Disabled);
    expect(evalGlobalnet({ brokers: [], clusters })).toBe(
      GlobalnetStatus.NotFound
    );
    expect(doesGlobalnetBlockProceed(GlobalnetStatus.Disabled)).toBe(false);
    expect(doesGlobalnetBlockProceed(GlobalnetStatus.NotFound)).toBe(false);
  });

  it('reports enabled-with-overlap when Globalnet covers overlapping CIDRs', () => {
    const same = claim(['10.128.0.0/14'], ['172.30.0.0/16']);
    expect(
      evalGlobalnet({
        brokers: broker(true),
        clusters: [loadedCluster('a', same), loadedCluster('b', same)],
      })
    ).toBe(GlobalnetStatus.EnabledWithOverlap);
    expect(doesGlobalnetBlockProceed(GlobalnetStatus.EnabledWithOverlap)).toBe(
      false
    );
  });

  it('falls back to SubmarinerCluster CIDRs when claims are absent', () => {
    const submarinerClusters: SubmarinerClusterKind[] = [
      {
        metadata: { name: 'a' },
        spec: {
          cluster_id: 'a',
          cluster_cidr: ['10.128.0.0/14'],
          service_cidr: ['172.30.0.0/16'],
        },
      },
      {
        metadata: { name: 'b' },
        spec: {
          cluster_id: 'b',
          cluster_cidr: ['10.132.0.0/14'],
          service_cidr: ['172.31.0.0/16'],
        },
      },
    ];

    expect(
      evalGlobalnet({
        brokers: broker(true),
        clusters: [
          { clusterName: 'a', loaded: true },
          { clusterName: 'b', loaded: true },
        ],
        submarinerClusters,
      })
    ).toBe(GlobalnetStatus.Enabled);
  });

  it('returns Skipped when skipGlobalnetCheck is true', () => {
    expect(
      evalGlobalnet({
        brokers: broker(true),
        clusters: [
          loadedCluster('a', claim(['10.128.0.0/14'], ['172.30.0.0/16'])),
          loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
        ],
        skip: true,
      })
    ).toBe(GlobalnetStatus.Skipped);
  });

  it('returns Checking while watches are loading', () => {
    expect(
      evalGlobalnet({
        brokersLoaded: false,
        clusters: [
          { clusterName: 'a', loaded: false },
          { clusterName: 'b', loaded: false },
        ],
        submarinerClustersLoaded: false,
      })
    ).toBe(GlobalnetStatus.Checking);
  });
});

describe('network claim CIDR parsing via evaluateGlobalnetPrePair', () => {
  const readablePeer = loadedCluster(
    'a',
    claim(['10.128.0.0/14'], ['172.30.0.0/16'])
  );

  it('parses clusterNetwork object entries', () => {
    expect(
      evalGlobalnet({
        brokers: broker(false),
        clusters: [
          loadedCluster(
            'a',
            JSON.stringify({
              clusterNetwork: [{ cidr: '10.128.0.0/14' }],
              serviceNetwork: ['172.30.0.0/16'],
            })
          ),
          loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
        ],
      })
    ).toBe(GlobalnetStatus.Disabled);
  });

  it('parses serviceNetwork string entries', () => {
    expect(
      evalGlobalnet({
        brokers: broker(false),
        clusters: [
          loadedCluster(
            'a',
            JSON.stringify({
              clusterNetwork: ['10.128.0.0/14'],
              serviceNetwork: ['172.30.0.0/16'],
            })
          ),
          loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
        ],
      })
    ).toBe(GlobalnetStatus.Disabled);
  });

  it.each([
    ['undefined', undefined],
    ['invalid JSON text', 'not-json'],
    ['JSON missing clusterNetwork and serviceNetwork', JSON.stringify({})],
  ])('drives CidrUnread for %s', (_label, value) => {
    const unreadCluster: ManagedClusterNetworkInfo =
      value === undefined
        ? { clusterName: 'b', loaded: true }
        : loadedCluster('b', value);
    expect(
      evalGlobalnet({
        brokers: broker(false),
        clusters: [readablePeer, unreadCluster],
      })
    ).toBe(GlobalnetStatus.CidrUnread);
    expect(doesGlobalnetBlockProceed(GlobalnetStatus.CidrUnread)).toBe(true);
  });
});

describe('evaluateSubmarinerPrePair without the ACM add-on', () => {
  const notFound = {
    addon: undefined,
    loaded: true,
    loadError: { response: { status: 404 }, message: 'NotFound' },
  };

  it('reports NotInstalled without blocking when neither cluster is ACM-managed', () => {
    expect(evaluateSubmarinerPrePair([notFound, notFound])).toEqual({
      canProceed: true,
      status: SubmarinerStatus.NotInstalled,
    });
  });

  it('still blocks a mixed pair as Inconsistent', () => {
    expect(
      evaluateSubmarinerPrePair([
        { addon: healthyAddonLegacy(), loaded: true, loadError: null },
        notFound,
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Inconsistent });
  });
});
