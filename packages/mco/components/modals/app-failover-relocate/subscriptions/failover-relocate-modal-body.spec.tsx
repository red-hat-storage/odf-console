import * as React from 'react';
import { DRActionType, ReplicationType } from '@odf/mco/constants';
import { ApplicationKind } from '@odf/shared/types';
import { render } from '@testing-library/react';
import { ErrorMessageType } from './error-messages';
import {
  FailoverRelocateModalBody,
  findErrorMessage,
} from './failover-relocate-modal-body';
import { failoverAndRelocateState, FailoverAndRelocateType } from './reducer';

const notLoaded = { data: [], loaded: false, loadError: null };

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResources: () => ({
    subscriptions: notLoaded,
    placementRules: notLoaded,
    placements: notLoaded,
    placementDecisions: notLoaded,
    drPlacementControls: notLoaded,
    drPolicies: notLoaded,
  }),
}));

jest.mock('@odf/shared/hooks', () => ({
  ...jest.requireActual('@odf/shared/hooks'),
  useDocVersion: () => '',
}));

const application = {
  metadata: { name: 'app', namespace: 'app-ns' },
} as ApplicationKind;

const startBody = (
  replicationType: ReplicationType,
  isTestFailover: boolean
) => {
  const dispatch = jest.fn();
  const state = {
    ...failoverAndRelocateState(DRActionType.FAILOVER),
    selectedDRPolicy: { policyName: 'policy', replicationType },
  };
  render(
    <FailoverRelocateModalBody
      application={application}
      action={DRActionType.FAILOVER}
      state={state}
      dispatch={dispatch}
      isTestFailover={isTestFailover}
    />
  );
  return dispatch;
};

const testFailoverError = (code: number) => ({
  type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
  payload: { testFailoverErrorMessage: code },
});

describe('Subscription test failover', () => {
  // A fenced primary would otherwise pass the Metro-DR fencing checks.
  it('blocks a test on a Metro-DR policy', () => {
    const dispatch = startBody(ReplicationType.SYNC, true);
    expect(dispatch).toHaveBeenCalledWith(
      testFailoverError(ErrorMessageType.TEST_FAILOVER_NOT_SUPPORTED)
    );
  });

  it('allows a test on a Regional-DR policy', () => {
    const dispatch = startBody(ReplicationType.ASYNC, true);
    expect(dispatch).toHaveBeenCalledWith(testFailoverError(0));
  });

  it('does not block a real Metro-DR failover', () => {
    const dispatch = startBody(ReplicationType.SYNC, false);
    expect(dispatch).toHaveBeenCalledWith(testFailoverError(0));
  });

  it('keeps Start disabled while the test error is set', () => {
    expect(
      findErrorMessage(
        {
          ...failoverAndRelocateState(DRActionType.FAILOVER).errorMessage,
          testFailoverErrorMessage:
            ErrorMessageType.TEST_FAILOVER_NOT_SUPPORTED,
        },
        false
      )
    ).toBe(ErrorMessageType.TEST_FAILOVER_NOT_SUPPORTED);
  });
});
