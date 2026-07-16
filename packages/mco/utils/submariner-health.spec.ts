import {
  GlobalnetCheckStatus,
  GlobalnetRequirement,
  SUBMARINER_CONDITION_TYPES,
  SubmarinerClusterHealth,
} from '@odf/mco/constants';
import { SubmarinerAddOnKind } from '@odf/mco/types';
import { doCidrsOverlap } from '@odf/shared/utils';
import {
  evaluateGlobalnetRequirement,
  evaluateGlobalnetStatus,
  evaluateSubmarinerPrePair,
  extractCidrsFromNetworkClaimValue,
  getSubmarinerClusterHealth,
  isMixedSubmarinerInstall,
  isMixedSubmarinerInstallMethod,
  isGlobalnetRequiredButNotEnabled,
} from './submariner-health';

const healthyAddon: SubmarinerAddOnKind = {
  apiVersion: 'addon.open-cluster-management.io/v1alpha1',
  kind: 'ManagedClusterAddOn',
  metadata: { name: 'submariner', namespace: 'local-cluster' },
  status: {
    conditions: [
      {
        type: SUBMARINER_CONDITION_TYPES.AVAILABLE,
        status: 'True',
        message: 'Submariner agent is deployed and functioning normally.',
        reason: 'SubmarinerAgentDeployed',
      },
      {
        type: 'SubMarinerAgentDegraded',
        status: 'False',
        message: 'Submariner agent is not degraded.',
        reason: 'SubmarinerAgentHealthy',
      },
      {
        type: 'SubMarinerConnectionDegraded',
        status: 'False',
        message:
          'All Submariner tunnel connections to remote clusters are established.',
        reason: 'SubMarinerConnectionsHealthy',
      },
    ],
  },
};

const degradedAddon: SubmarinerAddOnKind = {
  ...healthyAddon,
  metadata: { name: 'submariner', namespace: 'dr1' },
  status: {
    conditions: [
      {
        type: SUBMARINER_CONDITION_TYPES.AVAILABLE,
        status: 'True',
      },
      {
        type: 'SubMarinerAgentDegraded',
        status: 'False',
      },
      {
        type: 'SubMarinerConnectionDegraded',
        status: 'True',
        message: 'No connectivity to broker',
      },
    ],
  },
};

describe('getSubmarinerClusterHealth', () => {
  it('returns checking when addon is not loaded', () => {
    expect(getSubmarinerClusterHealth(undefined, false, null)).toBe(
      SubmarinerClusterHealth.Checking
    );
  });

  it('returns notInstalled when addon is not found', () => {
    expect(
      getSubmarinerClusterHealth(undefined, true, {
        response: { status: 404 },
        message: 'NotFound',
      })
    ).toBe(SubmarinerClusterHealth.NotInstalled);
  });

  it('returns degraded when addon watch fails with a non-404 error', () => {
    expect(
      getSubmarinerClusterHealth(undefined, true, {
        response: { status: 403 },
        message: 'Forbidden',
      })
    ).toBe(SubmarinerClusterHealth.Degraded);
  });

  it('returns healthy when condition types use mixed SubMariner casing', () => {
    expect(getSubmarinerClusterHealth(healthyAddon, true, null)).toBe(
      SubmarinerClusterHealth.Healthy
    );
  });

  it('returns progressing when Available exists but degraded conditions are not set yet', () => {
    const installingAddon: SubmarinerAddOnKind = {
      ...healthyAddon,
      status: {
        conditions: [
          {
            type: SUBMARINER_CONDITION_TYPES.AVAILABLE,
            status: 'True',
          },
        ],
      },
    };
    expect(getSubmarinerClusterHealth(installingAddon, true, null)).toBe(
      SubmarinerClusterHealth.Progressing
    );
  });

  it('returns degraded when connection is degraded', () => {
    expect(getSubmarinerClusterHealth(degradedAddon, true, null)).toBe(
      SubmarinerClusterHealth.Degraded
    );
  });

  it('returns progressing when required conditions are missing', () => {
    const progressingAddon: SubmarinerAddOnKind = {
      ...healthyAddon,
      status: {
        conditions: [
          {
            type: SUBMARINER_CONDITION_TYPES.AVAILABLE,
            status: 'True',
          },
          {
            type: SUBMARINER_CONDITION_TYPES.CONNECTION_DEGRADED,
            status: 'False',
          },
        ],
      },
    };
    expect(getSubmarinerClusterHealth(progressingAddon, true, null)).toBe(
      SubmarinerClusterHealth.Progressing
    );
  });
});

describe('evaluateSubmarinerPrePair', () => {
  it('allows proceed when both clusters do not have Submariner addon', () => {
    const result = evaluateSubmarinerPrePair([
      {
        clusterName: 'a',
        addon: undefined,
        loaded: true,
        loadError: { response: { status: 404 } },
      },
      {
        clusterName: 'b',
        addon: undefined,
        loaded: true,
        loadError: { response: { status: 404 } },
      },
    ]);
    expect(result.overallHealth).toBe(SubmarinerClusterHealth.NotInstalled);
    expect(result.canProceed).toBe(true);
  });

  it('blocks proceed when one cluster is degraded', () => {
    const result = evaluateSubmarinerPrePair([
      {
        clusterName: 'a',
        addon: healthyAddon,
        loaded: true,
        loadError: null,
      },
      {
        clusterName: 'b',
        addon: degradedAddon,
        loaded: true,
        loadError: null,
      },
    ]);
    expect(result.overallHealth).toBe(SubmarinerClusterHealth.Degraded);
    expect(result.canProceed).toBe(false);
  });

  it('allows proceed when both clusters are healthy', () => {
    const result = evaluateSubmarinerPrePair([
      {
        clusterName: 'a',
        addon: healthyAddon,
        loaded: true,
        loadError: null,
      },
      {
        clusterName: 'b',
        addon: {
          ...healthyAddon,
          metadata: { name: 'submariner', namespace: 'b' },
        },
        loaded: true,
        loadError: null,
      },
    ]);
    expect(result.overallHealth).toBe(SubmarinerClusterHealth.Healthy);
    expect(result.canProceed).toBe(true);
  });

  it('blocks proceed when only one cluster has Submariner addon', () => {
    const result = evaluateSubmarinerPrePair([
      {
        clusterName: 'a',
        addon: healthyAddon,
        loaded: true,
        loadError: null,
      },
      {
        clusterName: 'b',
        addon: undefined,
        loaded: true,
        loadError: { response: { status: 404 } },
      },
    ]);
    expect(result.canProceed).toBe(false);
  });

  it('allows proceed when both clusters have upstream Submariner detected', () => {
    const result = evaluateSubmarinerPrePair([
      {
        clusterName: 'a',
        addon: undefined,
        loaded: true,
        loadError: { response: { status: 404 } },
        upstreamDetected: true,
      },
      {
        clusterName: 'b',
        addon: undefined,
        loaded: true,
        loadError: { response: { status: 404 } },
        upstreamDetected: true,
      },
    ]);
    expect(result.overallHealth).toBe(SubmarinerClusterHealth.UpstreamDetected);
    expect(result.canProceed).toBe(true);
  });

  it('allows proceed when ACM-managed and upstream Submariner are both detected', () => {
    const result = evaluateSubmarinerPrePair([
      {
        clusterName: 'a',
        addon: healthyAddon,
        loaded: true,
        loadError: null,
      },
      {
        clusterName: 'b',
        addon: undefined,
        loaded: true,
        loadError: { response: { status: 404 } },
        upstreamDetected: true,
      },
    ]);
    expect(result.overallHealth).toBe(SubmarinerClusterHealth.UpstreamDetected);
    expect(result.canProceed).toBe(true);
  });

  it('blocks proceed when ACM-managed cluster is degraded even if peer is upstream', () => {
    const result = evaluateSubmarinerPrePair([
      {
        clusterName: 'a',
        addon: degradedAddon,
        loaded: true,
        loadError: null,
      },
      {
        clusterName: 'b',
        addon: undefined,
        loaded: true,
        loadError: { response: { status: 404 } },
        upstreamDetected: true,
      },
    ]);
    expect(result.canProceed).toBe(false);
  });
});

describe('isMixedSubmarinerInstall', () => {
  it('returns false when both clusters use upstream Submariner', () => {
    expect(
      isMixedSubmarinerInstall([
        {
          clusterName: 'a',
          health: SubmarinerClusterHealth.UpstreamDetected,
        },
        {
          clusterName: 'b',
          health: SubmarinerClusterHealth.UpstreamDetected,
        },
      ])
    ).toBe(false);
  });

  it('returns true when only one cluster has Submariner', () => {
    expect(
      isMixedSubmarinerInstall([
        {
          clusterName: 'a',
          health: SubmarinerClusterHealth.UpstreamDetected,
        },
        {
          clusterName: 'b',
          health: SubmarinerClusterHealth.NotInstalled,
        },
      ])
    ).toBe(true);
  });
});

describe('isMixedSubmarinerInstallMethod', () => {
  it('returns true when one cluster is ACM-managed and one is upstream', () => {
    expect(
      isMixedSubmarinerInstallMethod([
        {
          clusterName: 'a',
          health: SubmarinerClusterHealth.Healthy,
        },
        {
          clusterName: 'b',
          health: SubmarinerClusterHealth.UpstreamDetected,
        },
      ])
    ).toBe(true);
  });

  it('returns false when both clusters use the same install method', () => {
    expect(
      isMixedSubmarinerInstallMethod([
        {
          clusterName: 'a',
          health: SubmarinerClusterHealth.Healthy,
        },
        {
          clusterName: 'b',
          health: SubmarinerClusterHealth.Healthy,
        },
      ])
    ).toBe(false);
  });
});

describe('CIDR overlap and Globalnet requirement', () => {
  it('detects overlapping and non-overlapping CIDRs', () => {
    expect(doCidrsOverlap('10.128.0.0/14', '10.128.0.0/14')).toBe(true);
    expect(doCidrsOverlap('10.128.0.0/14', '10.132.0.0/14')).toBe(false);
    expect(doCidrsOverlap('172.30.0.0/16', '172.30.10.0/24')).toBe(true);
  });

  it('parses OpenShift network claim JSON values', () => {
    expect(
      extractCidrsFromNetworkClaimValue(
        JSON.stringify({
          clusterNetwork: [{ cidr: '10.128.0.0/14', hostPrefix: 23 }],
          serviceNetwork: ['172.30.0.0/16'],
        })
      )
    ).toEqual({
      clusterCidrs: ['10.128.0.0/14'],
      serviceCidrs: ['172.30.0.0/16'],
    });
  });

  it('marks Globalnet as required when pod CIDRs overlap', () => {
    const requirement = evaluateGlobalnetRequirement(
      [
        {
          clusterName: 'a',
          loaded: true,
          clusterClaims: [
            {
              name: 'network.openshift.io',
              value: JSON.stringify({
                clusterNetwork: [{ cidr: '10.128.0.0/14' }],
                serviceNetwork: ['172.30.0.0/16'],
              }),
            },
          ],
        },
        {
          clusterName: 'b',
          loaded: true,
          clusterClaims: [
            {
              name: 'network.openshift.io',
              value: JSON.stringify({
                clusterNetwork: [{ cidr: '10.128.0.0/14' }],
                serviceNetwork: ['172.31.0.0/16'],
              }),
            },
          ],
        },
      ],
      undefined,
      true,
      false
    );
    expect(requirement).toBe(GlobalnetRequirement.Required);
  });

  it('marks Globalnet as not required when CIDRs do not overlap', () => {
    const requirement = evaluateGlobalnetRequirement(
      [
        {
          clusterName: 'a',
          loaded: true,
          clusterClaims: [
            {
              name: 'network.openshift.io',
              value: JSON.stringify({
                clusterNetwork: [{ cidr: '10.128.0.0/14' }],
                serviceNetwork: ['172.30.0.0/16'],
              }),
            },
          ],
        },
        {
          clusterName: 'b',
          loaded: true,
          clusterClaims: [
            {
              name: 'network.openshift.io',
              value: JSON.stringify({
                clusterNetwork: [{ cidr: '10.132.0.0/14' }],
                serviceNetwork: ['172.31.0.0/16'],
              }),
            },
          ],
        },
      ],
      undefined,
      true,
      false
    );
    expect(requirement).toBe(GlobalnetRequirement.NotRequired);
  });

  it('falls back to Submariner Cluster CIDRs when claims are missing', () => {
    const requirement = evaluateGlobalnetRequirement(
      [
        { clusterName: 'a', loaded: true },
        { clusterName: 'b', loaded: true },
      ],
      [
        {
          metadata: { name: 'a' },
          spec: {
            cluster_cidr: ['10.128.0.0/14'],
            service_cidr: ['172.30.0.0/16'],
          },
        },
        {
          metadata: { name: 'b' },
          spec: {
            cluster_cidr: ['10.128.0.0/14'],
            service_cidr: ['172.31.0.0/16'],
          },
        },
      ],
      true,
      false
    );
    expect(requirement).toBe(GlobalnetRequirement.Required);
  });

  it('returns unknown when network CIDRs cannot be resolved', () => {
    const requirement = evaluateGlobalnetRequirement(
      [
        { clusterName: 'a', loaded: true },
        { clusterName: 'b', loaded: true },
      ],
      [],
      true,
      false
    );
    expect(requirement).toBe(GlobalnetRequirement.Unknown);
  });

  it('warns when Globalnet is required but not enabled', () => {
    expect(
      isGlobalnetRequiredButNotEnabled(
        GlobalnetCheckStatus.Disabled,
        GlobalnetRequirement.Required
      )
    ).toBe(true);
    expect(
      evaluateGlobalnetStatus(
        [{ spec: { globalnetEnabled: false } }],
        true,
        null,
        false
      )
    ).toBe(GlobalnetCheckStatus.Disabled);
  });
});
