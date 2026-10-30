import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import { TFunction } from 'i18next';
import { IAction } from '@patternfly/react-table';
import {
  ApplicationType,
  DRActionType,
  LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION,
} from '../../constants';
import { DRPlacementControlKind, Phase } from '../../types';
import { getRowActions } from './utils';

const t = ((key: string) => key) as unknown as TFunction<string>;
const launcher = jest.fn();
const navigate = jest.fn();

const pav = {
  status: { applicationInfo: { type: ApplicationType.Discovered } },
} as ProtectedApplicationViewKind;

const getDRPC = (
  spec: Partial<DRPlacementControlKind['spec']> = {},
  phase = Phase.Deployed
): DRPlacementControlKind => ({
  metadata: {
    name: 'drpc',
    namespace: 'app-ns',
    annotations: {
      [LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION]: 'east-1',
    },
  },
  spec: { drPolicyRef: { name: 'policy' }, pvcSelector: {}, ...spec },
  status: { phase },
});

const getAction = (actions: IAction[], index: number) => actions[index];
// Order: Edit configuration, Failover, Relocate, Test failover, Remove DR
const [FAILOVER, RELOCATE, TEST_FAILOVER] = [1, 2, 3];

describe('Protected application row actions', () => {
  afterEach(() => jest.clearAllMocks());

  it('starts a test failover for a healthy application', () => {
    const drpc = getDRPC();
    const actions = getRowActions(t, launcher, navigate, drpc, pav);
    const testFailover = getAction(actions, TEST_FAILOVER);

    expect(testFailover.isAriaDisabled).toBeUndefined();
    testFailover.onClick(null, null, null, null);
    expect(launcher).toHaveBeenCalledWith(expect.anything(), {
      isOpen: true,
      extraProps: {
        application: drpc,
        action: DRActionType.FAILOVER,
        isTestFailover: true,
      },
    });
  });

  it('disables DR actions while a test failover runs', () => {
    const activeTest = getDRPC(
      {
        action: DRActionType.FAILOVER,
        dryRun: true,
        failoverCluster: 'west-1',
      },
      Phase.FailedOver
    );

    const actions = getRowActions(t, launcher, navigate, activeTest, pav);
    [FAILOVER, RELOCATE, TEST_FAILOVER].forEach((index) => {
      expect(getAction(actions, index).isAriaDisabled).toBe(true);
      expect(getAction(actions, index).tooltipProps.content).toBe(
        'Unavailable while a test failover is in progress.'
      );
    });
  });

  it('disables test failover while another DR operation runs', () => {
    const actions = getRowActions(
      t,
      launcher,
      navigate,
      getDRPC({ action: DRActionType.FAILOVER }, Phase.FailingOver),
      pav
    );

    expect(getAction(actions, FAILOVER).isAriaDisabled).toBeUndefined();
    expect(getAction(actions, TEST_FAILOVER).isAriaDisabled).toBe(true);
    expect(getAction(actions, TEST_FAILOVER).tooltipProps.content).toBe(
      'Unavailable while a disaster recovery operation is in progress.'
    );
  });
});
