import { DRActionType } from '../constants';
import { DRPlacementControlKind, Phase } from '../types';
import { isDiscoveredDRPC } from './disaster-recovery';
import { getStartTestFailoverPatch } from './test-failover';

const getDRPC = (): DRPlacementControlKind => ({
  metadata: { name: 'drpc', namespace: 'app-ns' },
  spec: {
    drPolicyRef: { name: 'policy' },
    pvcSelector: {},
    action: DRActionType.FAILOVER,
    failoverCluster: 'west-1',
    preferredCluster: 'east-1',
    dryRun: true,
  },
  status: { phase: Phase.FailedOver },
});

describe('Test failover utils', () => {
  it('starts the test by adding spec.dryRun', () => {
    expect(getStartTestFailoverPatch()).toEqual([
      { op: 'add', path: '/spec/dryRun', value: true },
    ]);
  });

  it('detects discovered applications from the protected namespaces', () => {
    const drpc = getDRPC();
    expect(isDiscoveredDRPC(drpc)).toBe(false);
    drpc.spec.protectedNamespaces = ['app-ns'];
    expect(isDiscoveredDRPC(drpc)).toBe(true);
  });
});
