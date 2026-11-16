import { renderHook } from '@testing-library/react';
import { DRActionType } from '../../constants';
import { Phase, Progression } from '../../types';
import { useDROperationAlert } from './dr-operation-alert-helper';

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
});
