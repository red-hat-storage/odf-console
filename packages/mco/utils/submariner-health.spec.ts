import { GlobalnetStatus, SubmarinerStatus } from '@odf/mco/constants';
import { SubmarinerAddOnKind } from '@odf/mco/types';
import {
  doesGlobalnetBlockProceed,
  evaluateGlobalnetPrePair,
  evaluateSubmarinerPrePair,
  extractCidrsFromNetworkClaimValue,
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
    { type: 'SubmarinerAgentAvailable', status: 'True' },
    { type: 'SubmarinerConnectionDegraded', status: 'False' },
  ]);

const progressingAddon = () =>
  addonWithConditions([{ type: 'SubmarinerAgentAvailable', status: 'False' }]);

const degradedAddon = () =>
  addonWithConditions([
    { type: 'SubmarinerAgentAvailable', status: 'True' },
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

  it('reports NotInstalled when both watches are 404 or addons are missing', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(undefined, true, notFoundError),
        cluster(undefined),
      ])
    ).toEqual({ canProceed: true, status: SubmarinerStatus.NotInstalled });
  });

  it('reports Progressing while Available is not True', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(progressingAddon()),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Progressing });
  });

  it('reports Progressing when Available is True but ConnectionDegraded is absent', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(
          addonWithConditions([
            { type: 'SubmarinerAgentAvailable', status: 'True' },
          ])
        ),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Progressing });
  });

  it('reports Degraded when ConnectionDegraded is True', () => {
    expect(
      evaluateSubmarinerPrePair([
        cluster(degradedAddon()),
        cluster(healthyAddon()),
      ])
    ).toEqual({ canProceed: false, status: SubmarinerStatus.Degraded });
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

const broker = (globalnetEnabled: boolean) => [
  {
    metadata: { name: 'submariner-broker' },
    spec: { globalnetEnabled },
  },
];

describe('evaluateGlobalnetPrePair', () => {
  it('blocks when CIDR overlap cannot be determined', () => {
    expect(
      evaluateGlobalnetPrePair(
        broker(false),
        true,
        null,
        [
          loadedCluster('a', claim(['10.128.0.0/14'], ['172.30.0.0/16'])),
          { clusterName: 'b', loaded: true },
        ],
        undefined,
        true,
        false
      )
    ).toBe(GlobalnetStatus.CidrUnread);

    expect(
      evaluateGlobalnetPrePair(
        broker(false),
        true,
        null,
        [
          loadedCluster('a', claim(['not-a-cidr'], ['172.30.0.0/16'])),
          loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
        ],
        undefined,
        true,
        false
      )
    ).toBe(GlobalnetStatus.CidrUnread);

    expect(doesGlobalnetBlockProceed(GlobalnetStatus.CidrUnread)).toBe(true);
  });

  it('blocks with LoadError when Broker watch fails', () => {
    expect(
      evaluateGlobalnetPrePair(
        undefined,
        true,
        new Error('forbidden'),
        [
          loadedCluster('a', claim(['10.128.0.0/14'], ['172.30.0.0/16'])),
          loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
        ],
        undefined,
        true,
        false
      )
    ).toBe(GlobalnetStatus.LoadError);
    expect(doesGlobalnetBlockProceed(GlobalnetStatus.LoadError)).toBe(true);
  });

  it('blocks when CIDRs overlap and Globalnet is off or missing', () => {
    const same = claim(['10.128.0.0/14'], ['172.30.0.0/16']);
    const clusters = [loadedCluster('a', same), loadedCluster('b', same)];

    expect(
      evaluateGlobalnetPrePair(
        broker(false),
        true,
        null,
        clusters,
        undefined,
        true,
        false
      )
    ).toBe(GlobalnetStatus.OverlapGlobalnetOff);
    expect(
      evaluateGlobalnetPrePair([], true, null, clusters, undefined, true, false)
    ).toBe(GlobalnetStatus.OverlapBrokerMissing);
    expect(
      doesGlobalnetBlockProceed(GlobalnetStatus.OverlapGlobalnetOff)
    ).toBe(true);
  });

  it('allows and reports status when there is no overlap', () => {
    const clusters = [
      loadedCluster('a', claim(['10.128.0.0/14'], ['172.30.0.0/16'])),
      loadedCluster('b', claim(['10.132.0.0/14'], ['172.31.0.0/16'])),
    ];

    expect(
      evaluateGlobalnetPrePair(
        broker(true),
        true,
        null,
        clusters,
        undefined,
        true,
        false
      )
    ).toBe(GlobalnetStatus.Enabled);
    expect(
      evaluateGlobalnetPrePair(
        broker(false),
        true,
        null,
        clusters,
        undefined,
        true,
        false
      )
    ).toBe(GlobalnetStatus.Disabled);
    expect(doesGlobalnetBlockProceed(GlobalnetStatus.Disabled)).toBe(false);
  });

  it('reports enabled-with-overlap when Globalnet covers overlapping CIDRs', () => {
    const same = claim(['10.128.0.0/14'], ['172.30.0.0/16']);
    expect(
      evaluateGlobalnetPrePair(
        broker(true),
        true,
        null,
        [loadedCluster('a', same), loadedCluster('b', same)],
        undefined,
        true,
        false
      )
    ).toBe(GlobalnetStatus.EnabledWithOverlap);
    expect(
      doesGlobalnetBlockProceed(GlobalnetStatus.EnabledWithOverlap)
    ).toBe(false);
  });
});

describe('extractCidrsFromNetworkClaimValue', () => {
  it('parses cluster and service networks from the claim JSON', () => {
    expect(
      extractCidrsFromNetworkClaimValue(
        JSON.stringify({
          clusterNetwork: [{ cidr: '10.128.0.0/14' }],
          serviceNetwork: ['172.30.0.0/16'],
        })
      )
    ).toEqual({
      clusterCidrs: ['10.128.0.0/14'],
      serviceCidrs: ['172.30.0.0/16'],
    });
  });
});

describe('evaluateSubmarinerPrePair upstream detection', () => {
  const notFound = {
    addon: undefined,
    loaded: true,
    loadError: { response: { status: 404 }, message: 'NotFound' },
  };

  it('allows proceed when upstream Submariner is detected on both clusters', () => {
    const result = evaluateSubmarinerPrePair([
      { ...notFound, upstreamDetected: true },
      { ...notFound, upstreamDetected: true },
    ]);
    expect(result.status).toBe(SubmarinerStatus.UpstreamDetected);
    expect(result.canProceed).toBe(true);
  });

  it('keeps ACM Globalnet path when only one cluster is upstream', () => {
    const healthyAddon = {
      apiVersion: 'addon.open-cluster-management.io/v1alpha1',
      kind: 'ManagedClusterAddOn',
      metadata: { name: 'submariner' },
      status: {
        conditions: [
          {
            type: 'SubmarinerAgentAvailable',
            status: 'True',
          },
          {
            type: 'SubMarinerAgentDegraded',
            status: 'False',
          },
          {
            type: 'SubMarinerConnectionDegraded',
            status: 'False',
          },
        ],
      },
    };
    const result = evaluateSubmarinerPrePair([
      { addon: healthyAddon, loaded: true, loadError: null },
      { ...notFound, upstreamDetected: true },
    ]);
    expect(result.status).toBe(SubmarinerStatus.Healthy);
    expect(result.canProceed).toBe(true);
  });
});
