import * as React from 'react';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import { TFunction } from 'i18next';
import { IAction } from '@patternfly/react-table';
import {
  ApplicationType,
  DRActionType,
  LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION,
  TEST_FAILOVER_DRYRUN_ANNOTATION,
} from '../../constants';
import { DRPlacementControlKind, Phase, Progression } from '../../types';
import { DRPlacementControlParser } from '../modals/app-failover-relocate/parser/discovered-application-parser';
import { ApplicationActionModal } from '../modals/protected-applications/applications-action-modal';
import { getRowActions } from './utils';

// Row action titles are React nodes (label + muted description).
const actionLabel = (action: IAction): string => {
  const { title } = action;
  if (typeof title === 'string') return title;
  if (!React.isValidElement(title)) return '';
  const children = (title as React.ReactElement).props?.children;
  const first = Array.isArray(children) ? children[0] : children;
  return typeof first === 'string' ? first : '';
};

const expectNoTestFailover = (actions: IAction[]) => {
  expect(actions.map(actionLabel)).not.toContain('Test failover');
};

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
// Order: Edit configuration, Test failover, Failover, Relocate, Remove DR
const [TEST_FAILOVER, FAILOVER, RELOCATE] = [1, 2, 3];

describe('Protected application row actions', () => {
  afterEach(() => jest.clearAllMocks());

  it('starts a test failover for a healthy application', () => {
    const drpc = getDRPC();
    const actions = getRowActions(t, launcher, navigate, drpc, pav);
    const testFailover = getAction(actions, TEST_FAILOVER);

    expect(testFailover.isAriaDisabled).toBeUndefined();
    testFailover.onClick(null, null, null, null);
    expect(launcher).toHaveBeenCalledWith(DRPlacementControlParser, {
      isOpen: true,
      extraProps: {
        application: drpc,
        action: DRActionType.FAILOVER,
        isTestFailover: true,
      },
    });
  });

  // A managed app can have a placement decision while last-app-deployment-cluster
  // is still empty. An empty name would make findCluster pick the first DR cluster,
  // so the test uses the same placement-decision modal as a real failover.
  it('starts a managed test failover from the placement decision modal', () => {
    const drpc = getDRPC();
    const managedPav = {
      status: {
        applicationInfo: {
          type: ApplicationType.ApplicationSet,
          applicationRef: { name: 'appset-1', namespace: 'app-ns' },
        },
      },
    } as ProtectedApplicationViewKind;
    const actions = getRowActions(t, launcher, navigate, drpc, managedPav);

    getAction(actions, TEST_FAILOVER).onClick(null, null, null, null);
    expect(launcher).toHaveBeenCalledWith(ApplicationActionModal, {
      isOpen: true,
      extraProps: {
        pav: managedPav,
        action: DRActionType.FAILOVER,
        isTestFailover: true,
      },
    });
  });

  it('hides Test failover for ApplicationSet without applicationRef, Subscription, and Metro-DR', () => {
    const noRefPav = {
      status: { applicationInfo: { type: ApplicationType.ApplicationSet } },
    } as ProtectedApplicationViewKind;
    const noRefActions = getRowActions(
      t,
      launcher,
      navigate,
      getDRPC(),
      noRefPav
    );
    expect(noRefActions).toHaveLength(4);
    expectNoTestFailover(noRefActions);

    const subPav = {
      status: { applicationInfo: { type: ApplicationType.Subscription } },
    } as ProtectedApplicationViewKind;
    const subActions = getRowActions(t, launcher, navigate, getDRPC(), subPav);
    expect(subActions).toHaveLength(4);
    expectNoTestFailover(subActions);

    const metroActions = getRowActions(t, launcher, navigate, getDRPC(), pav, {
      isMetroDR: true,
    });
    expect(metroActions).toHaveLength(4);
    expectNoTestFailover(metroActions);
  });

  it('disables DR actions while a test failover runs or WaitOnUser is annotated', () => {
    const activeTest = getDRPC(
      {
        action: DRActionType.FAILOVER,
        dryRun: true,
        failoverCluster: 'west-1',
      },
      Phase.FailedOver
    );
    let actions = getRowActions(t, launcher, navigate, activeTest, pav);
    [FAILOVER, RELOCATE, TEST_FAILOVER].forEach((index) => {
      expect(getAction(actions, index).isAriaDisabled).toBe(true);
      expect(getAction(actions, index).tooltipProps.content).toBe(
        'Unavailable while a test failover is in progress.'
      );
    });

    const ordinary = getDRPC({ failoverCluster: 'west-1' }, Phase.FailedOver);
    ordinary.status.progression = Progression.WaitOnUserToCleanUp;
    actions = getRowActions(t, launcher, navigate, ordinary, pav);
    expect(getAction(actions, FAILOVER).isAriaDisabled).toBeUndefined();
    expect(getAction(actions, TEST_FAILOVER).isAriaDisabled).toBeUndefined();

    const annotated = getDRPC({ failoverCluster: 'west-1' }, Phase.FailedOver);
    annotated.status.progression = Progression.WaitOnUserToCleanUp;
    annotated.metadata.annotations = {
      ...annotated.metadata.annotations,
      [TEST_FAILOVER_DRYRUN_ANNOTATION]: 'true',
    };
    actions = getRowActions(t, launcher, navigate, annotated, pav);
    [FAILOVER, RELOCATE, TEST_FAILOVER].forEach((index) => {
      expect(getAction(actions, index).isAriaDisabled).toBe(true);
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
