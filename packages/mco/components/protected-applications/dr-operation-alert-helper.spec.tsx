import { renderHook } from '@testing-library/react';
import { DRActionType } from '../../constants';
import { DRPlacementControlKind, Phase, Progression } from '../../types';
import {
  FAILED_OVER_APP_QUERY_PARAM,
  FAILED_OVER_CLUSTER_QUERY_PARAM,
  RELOCATED_APP_QUERY_PARAM,
  RELOCATED_CLUSTER_QUERY_PARAM,
  useDROperationAlert,
} from './dr-operation-alert-helper';

const navigate = jest.fn();

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => navigate,
  useLocation: () => ({
    pathname:
      '/multicloud/data-services/disaster-recovery/protected-applications',
  }),
}));

const drpc = ({
  dryRun,
  phase,
  progression,
  failoverCluster = 'west-1',
}: {
  dryRun?: boolean;
  phase: Phase;
  progression?: Progression | string;
  failoverCluster?: string;
}) => ({
  metadata: { name: 'app-drpc', namespace: 'app-ns' },
  spec: {
    drPolicyRef: { name: 'policy' },
    pvcSelector: {},
    action: DRActionType.FAILOVER,
    failoverCluster,
    dryRun,
  },
  status: { phase, progression },
});

describe('useDROperationAlert', () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it('announces Convert after leaving the hold, not Clean up rewrites', () => {
    const holding = drpc({
      dryRun: true,
      phase: Phase.FailedOver,
      progression: Progression.TestingFailover,
      failoverCluster: 'west-1',
    });
    const { rerender } = renderHook(
      ({ apps }) => useDROperationAlert(apps as any),
      { initialProps: { apps: [holding] } }
    );

    rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: Progression.TestingFailover,
          failoverCluster: 'west-1',
        }),
      ],
    });
    expect(navigate).not.toHaveBeenCalled();

    rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: Progression.CleaningUp,
          failoverCluster: 'west-1',
        }),
      ],
    });
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('failedover_app=app-drpc'),
      { replace: true }
    );
    navigate.mockReset();

    const cleanupHold = drpc({
      dryRun: true,
      phase: Phase.FailedOver,
      progression: Progression.TestingFailover,
      failoverCluster: 'west-1',
    });
    const view = renderHook(({ apps }) => useDROperationAlert(apps as any), {
      initialProps: { apps: [cleanupHold] },
    });
    view.rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: Progression.TestingFailover,
          failoverCluster: 'east-1',
        }),
      ],
    });
    view.rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: Progression.CleaningUp,
          failoverCluster: 'east-1',
        }),
      ],
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still shows the banner for a normal (non-test) failover', () => {
    const failingOver = drpc({
      dryRun: false,
      phase: Phase.FailingOver,
      progression: Progression.FailingOver,
    });
    const { rerender } = renderHook(
      ({ apps }) => useDROperationAlert(apps as any),
      { initialProps: { apps: [failingOver] } }
    );

    rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: Progression.Completed,
        }),
      ],
    });

    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('failedover_app=app-drpc'),
      { replace: true }
    );
  });

  it('keeps Convert pending through WaitForReadiness, then announces once', () => {
    const holding = drpc({
      dryRun: true,
      phase: Phase.FailedOver,
      progression: Progression.TestingFailover,
      failoverCluster: 'west-1',
    });
    const { rerender } = renderHook(
      ({ apps }) => useDROperationAlert(apps as any),
      { initialProps: { apps: [holding] } }
    );

    rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: 'WaitForReadiness',
          failoverCluster: 'west-1',
        }),
      ],
    });
    expect(navigate).not.toHaveBeenCalled();

    rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: Progression.Completed,
          failoverCluster: 'west-1',
        }),
      ],
    });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      expect.stringContaining('failedover_app=app-drpc'),
      { replace: true }
    );
  });

  it('announces a converted test once when Cleaning Up is followed by Completed', () => {
    const holding = drpc({
      dryRun: true,
      phase: Phase.FailedOver,
      progression: Progression.TestingFailover,
      failoverCluster: 'west-1',
    });
    const { rerender } = renderHook(
      ({ apps }) => useDROperationAlert(apps as any),
      { initialProps: { apps: [holding] } }
    );

    rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: Progression.CleaningUp,
          failoverCluster: 'west-1',
        }),
      ],
    });
    expect(navigate).toHaveBeenCalledTimes(1);

    rerender({
      apps: [
        drpc({
          dryRun: false,
          phase: Phase.FailedOver,
          progression: Progression.Completed,
          failoverCluster: 'west-1',
        }),
      ],
    });
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

const PAGE =
  '/multicloud/data-services/disaster-recovery/protected-applications';
const CLUSTER = 'dr1-nov-19-26';

type WatchStep = [Phase, string | undefined, number, boolean?];

const stepDrpc = (phase: Phase, progression?: string): DRPlacementControlKind =>
  ({
    metadata: { name: 'busybox-1', namespace: 'openshift-gitops' },
    spec: { failoverCluster: CLUSTER, preferredCluster: CLUSTER },
    status: { phase, progression },
  }) as DRPlacementControlKind;

const bannerFor = (phase: Phase) => {
  const [appParam, clusterParam] =
    phase === Phase.Relocated
      ? [RELOCATED_APP_QUERY_PARAM, RELOCATED_CLUSTER_QUERY_PARAM]
      : [FAILED_OVER_APP_QUERY_PARAM, FAILED_OVER_CLUSTER_QUERY_PARAM];
  return `${PAGE}?${appParam}=busybox-1&${clusterParam}=${CLUSTER}`;
};

// The third value is how many banners have fired. A true fourth value clears
// the count after that watch, so a later operation can be checked on its own.
const watch = (steps: WatchStep[]) => {
  const { rerender } = renderHook(
    ({ applications }: { applications: DRPlacementControlKind[] }) =>
      useDROperationAlert(applications),
    { initialProps: { applications: [stepDrpc(steps[0][0], steps[0][1])] } }
  );
  expect(navigate).not.toHaveBeenCalled();

  steps.slice(1).forEach(([phase, progression, calls, reset]) => {
    const before = navigate.mock.calls.length;
    rerender({ applications: [stepDrpc(phase, progression)] });
    expect(navigate).toHaveBeenCalledTimes(calls);
    if (calls > before) {
      expect(navigate).toHaveBeenLastCalledWith(bannerFor(phase), {
        replace: true,
      });
    }
    if (reset) navigate.mockClear();
  });
};

describe('useDROperationAlert completion timing', () => {
  beforeEach(() => navigate.mockClear());

  it('fires once when progression finishes on a later watch', () => {
    watch([
      [Phase.FailingOver, 'WaitForReadiness', 0],
      [Phase.FailedOver, Progression.CleaningUp, 0],
      [Phase.FailedOver, Progression.Completed, 1],
      [Phase.FailedOver, Progression.Completed, 1],
    ]);
    navigate.mockClear();
    watch([
      [Phase.Relocating, 'WaitForReadiness', 0],
      [Phase.Relocated, Progression.CleaningUp, 0],
      [Phase.Relocated, Progression.Completed, 1],
      [Phase.Relocated, Progression.Completed, 1],
    ]);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('fires once when phase and progression finish together', () => {
    watch([
      [Phase.FailingOver, 'WaitForReadiness', 0],
      [Phase.FailedOver, Progression.Completed, 1],
      [Phase.FailedOver, Progression.Completed, 1],
    ]);
    navigate.mockClear();
    watch([
      [Phase.Relocating, 'WaitForReadiness', 0],
      [Phase.Relocated, Progression.Completed, 1],
      [Phase.Relocated, Progression.Completed, 1],
    ]);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('stays quiet while work is still running or already complete', () => {
    watch([
      [Phase.FailingOver, 'WaitForReadiness', 0],
      [Phase.FailedOver, 'WaitForReadiness', 0],
      [Phase.FailedOver, Progression.CleaningUp, 0],
    ]);
    navigate.mockClear();
    watch([
      [Phase.FailedOver, undefined, 0],
      [Phase.FailedOver, undefined, 0],
    ]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('treats an empty progression as finished and does not repeat it', () => {
    watch([
      [Phase.FailingOver, 'WaitForReadiness', 0],
      [Phase.FailedOver, '', 1],
      [Phase.FailedOver, undefined, 1],
    ]);
    navigate.mockClear();
    watch([
      [Phase.FailedOver, Progression.CleaningUp, 0],
      [Phase.FailedOver, undefined, 1],
      [Phase.FailedOver, '', 1],
    ]);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('does not raise a stale banner when a new operation starts', () => {
    watch([
      [Phase.FailingOver, 'WaitForReadiness', 0],
      [Phase.FailedOver, Progression.CleaningUp, 0],
      [Phase.FailedOver, Progression.Completed, 1, true],
      [Phase.FailingOver, 'WaitForReadiness', 0],
      [Phase.FailedOver, Progression.CleaningUp, 0],
      [Phase.FailedOver, Progression.Completed, 1],
    ]);
    navigate.mockClear();
    watch([
      [Phase.FailedOver, Progression.Completed, 0],
      [Phase.Relocating, 'WaitForReadiness', 0],
      [Phase.Relocated, Progression.CleaningUp, 0],
      [Phase.Relocated, Progression.Completed, 1],
    ]);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
