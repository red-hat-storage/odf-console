import { DRActionType } from '../constants';
import { Phase, Progression } from '../types';
import {
  buildDRActionStartPatch,
  isDRPCBusyForNewAction,
} from './dr-action-start';

const drpc = ({
  action,
  dryRun,
  phase,
  progression,
}: {
  action?: string;
  dryRun?: boolean;
  phase?: string;
  progression?: string;
} = {}) =>
  ({
    metadata: { name: 'app', namespace: 'ns', generation: 7 },
    spec: {
      ...(action !== undefined && { action }),
      ...(dryRun !== undefined && { dryRun }),
    },
    status: {
      ...(phase !== undefined && { phase }),
      ...(progression !== undefined && { progression }),
    },
  }) as any;

describe('isDRPCBusyForNewAction', () => {
  it('is idle for Deployed with no action', () => {
    expect(
      isDRPCBusyForNewAction(
        drpc({ phase: Phase.Deployed, progression: Progression.Completed })
      )
    ).toBe(false);
  });

  it('is idle after completed Failover (standing action must not block)', () => {
    expect(
      isDRPCBusyForNewAction(
        drpc({
          action: DRActionType.FAILOVER,
          phase: Phase.FailedOver,
          progression: Progression.Completed,
        })
      )
    ).toBe(false);
  });

  it('is busy while FailingOver or Relocating', () => {
    expect(
      isDRPCBusyForNewAction(
        drpc({
          action: DRActionType.FAILOVER,
          phase: Phase.FailingOver,
          progression: Progression.FailingOver,
        })
      )
    ).toBe(true);
    expect(
      isDRPCBusyForNewAction(
        drpc({
          action: DRActionType.RELOCATE,
          phase: Phase.Relocating,
        })
      )
    ).toBe(true);
  });

  it('is busy while Initiating/Deploying with an action', () => {
    expect(
      isDRPCBusyForNewAction(
        drpc({
          action: DRActionType.FAILOVER,
          phase: Phase.Initiating,
        })
      )
    ).toBe(true);
  });

  it('is busy for dryRun / TestingFailover', () => {
    expect(isDRPCBusyForNewAction(drpc({ dryRun: true }))).toBe(true);
    expect(
      isDRPCBusyForNewAction(
        drpc({ progression: Progression.TestingFailover })
      )
    ).toBe(true);
  });

  it('is busy when action is set and progression is not Completed', () => {
    expect(
      isDRPCBusyForNewAction(
        drpc({
          action: DRActionType.FAILOVER,
          phase: Phase.FailedOver,
          progression: 'UpdatingProtection',
        })
      )
    ).toBe(true);
  });
});

describe('buildDRActionStartPatch', () => {
  it('prepends generation test when generation is provided', () => {
    expect(
      buildDRActionStartPatch({
        action: DRActionType.FAILOVER,
        failoverCluster: 'west',
        preferredCluster: 'east',
        generation: 7,
      })
    ).toEqual([
      { op: 'test', path: '/metadata/generation', value: 7 },
      { op: 'replace', path: '/spec/action', value: DRActionType.FAILOVER },
      { op: 'replace', path: '/spec/failoverCluster', value: 'west' },
      { op: 'replace', path: '/spec/preferredCluster', value: 'east' },
    ]);
  });

  it('omits generation test when generation is absent', () => {
    expect(
      buildDRActionStartPatch({
        action: DRActionType.RELOCATE,
        failoverCluster: 'east',
        preferredCluster: 'west',
      })
    ).toEqual([
      { op: 'replace', path: '/spec/action', value: DRActionType.RELOCATE },
      { op: 'replace', path: '/spec/failoverCluster', value: 'east' },
      { op: 'replace', path: '/spec/preferredCluster', value: 'west' },
    ]);
  });
});
