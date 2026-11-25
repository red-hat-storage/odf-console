import { renderHook } from '@testing-library/react-hooks';
import { DRPlacementControlKind, Phase, Progression } from '../../types';
import {
  FAILED_OVER_APP_QUERY_PARAM,
  FAILED_OVER_CLUSTER_QUERY_PARAM,
  RELOCATED_APP_QUERY_PARAM,
  RELOCATED_CLUSTER_QUERY_PARAM,
  useDROperationAlert,
} from './dr-operation-alert-helper';

const navigate = jest.fn();

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => navigate,
  useLocation: () => ({
    pathname:
      '/multicloud/data-services/disaster-recovery/protected-applications',
  }),
}));

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

  it('stays quiet while failover is stuck because a cluster is down, then announces once', () => {
    watch([
      [Phase.FailingOver, 'WaitForFencing', 0],
      [Phase.FailingOver, 'WaitForFencing', 0],
      [Phase.FailingOver, 'FailingOverToCluster', 0],
      [Phase.FailedOver, 'WaitForReadiness', 0],
      [Phase.FailedOver, Progression.CleaningUp, 0],
      [Phase.FailedOver, 'EnsuringVolSyncSetup', 0],
    ]);
    expect(navigate).not.toHaveBeenCalled();
    navigate.mockClear();
    watch([
      [Phase.FailingOver, 'WaitForFencing', 0],
      [Phase.FailedOver, Progression.CleaningUp, 0],
      [Phase.FailedOver, Progression.Completed, 1],
      [Phase.FailedOver, Progression.Completed, 1],
    ]);
  });

  it('stays quiet while relocate is stuck, then announces once', () => {
    watch([
      [Phase.Relocating, 'ClearingPlacement', 0],
      [Phase.Relocating, 'ClearingPlacement', 0],
      [Phase.Relocated, Progression.CleaningUp, 0],
      [Phase.Relocated, 'EnsuringVolSyncSetup', 0],
    ]);
    expect(navigate).not.toHaveBeenCalled();
    navigate.mockClear();
    watch([
      [Phase.Relocating, 'ClearingPlacement', 0],
      [Phase.Relocated, Progression.CleaningUp, 0],
      [Phase.Relocated, Progression.Completed, 1],
      [Phase.Relocated, Progression.Completed, 1],
    ]);
  });
});
