import { SubmarinerStatus } from '@odf/mco/constants';
import { SubmarinerAddOnKind } from '@odf/mco/types';
import {
  evaluateSubmarinerPrePair,
  shouldRunPrePairValidation,
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
      evaluateSubmarinerPrePair([cluster(healthyAddon()), cluster(healthyAddon())])
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

describe('shouldRunPrePairValidation', () => {
  it('runs only for Data Foundation with a valid two-cluster selection', () => {
    expect(shouldRunPrePairValidation(2, true, true)).toBe(true);
    expect(shouldRunPrePairValidation(2, true, false)).toBe(false);
    expect(shouldRunPrePairValidation(2, false, true)).toBe(false);
    expect(shouldRunPrePairValidation(1, true, true)).toBe(false);
  });
});
