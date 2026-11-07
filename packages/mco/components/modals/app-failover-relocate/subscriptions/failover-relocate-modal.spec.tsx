import * as React from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { DRActionType } from '../../../../constants';
import { SubscriptionFailoverRelocateModal } from './failover-relocate-modal';
import { FailoverAndRelocateType } from './reducer';

const drpc = { metadata: { name: 'sub-drpc', namespace: 'app-ns' } };

jest.mock('./failover-relocate-modal-body', () => ({
  ...jest.requireActual('./failover-relocate-modal-body'),
  FailoverRelocateModalBody: ({ dispatch }) => {
    const ReactActual = jest.requireActual('react');
    ReactActual.useEffect(() => {
      dispatch({
        type: FailoverAndRelocateType.SET_SELECTED_DR_POLICY,
        payload: { policyName: 'policy', drClusters: ['east-1', 'west-1'] },
      });
      dispatch({
        type: FailoverAndRelocateType.SET_SELECTED_TARGET_CLUSTER,
        payload: { clusterInfo: { clusterName: 'west-1' } },
      });
      dispatch({
        type: FailoverAndRelocateType.SET_DR_POLICY_CONTROL_STATE,
        payload: [{ drPlacementControl: drpc }],
      });
      dispatch({
        type: FailoverAndRelocateType.SET_SELECTED_SUBS_GROUP,
        payload: { selected: ['sub-drpc'], isUpdate: false },
      });
    }, [dispatch]);
    return null;
  },
}));

jest.mock('@openshift-console/dynamic-plugin-sdk/lib/api/core-api', () => ({
  ...jest.requireActual(
    '@openshift-console/dynamic-plugin-sdk/lib/api/core-api'
  ),
  k8sPatch: jest.fn(() => Promise.resolve({})),
}));

describe('SubscriptionFailoverRelocateModal', () => {
  it('starts a test failover with spec.dryRun', async () => {
    const user = userEvent.setup();

    render(
      <SubscriptionFailoverRelocateModal
        action={DRActionType.FAILOVER}
        isOpen
        close={jest.fn()}
        isTestFailover
      />
    );

    expect(
      screen.getByRole('dialog', { name: /Test Disaster Recovery \(DR\)/i })
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Start' }));

    await waitFor(() =>
      expect(k8sPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: drpc,
          data: [
            { op: 'replace', path: '/spec/action', value: 'Failover' },
            { op: 'replace', path: '/spec/failoverCluster', value: 'west-1' },
            { op: 'replace', path: '/spec/preferredCluster', value: 'east-1' },
            { op: 'add', path: '/spec/dryRun', value: true },
          ],
        })
      )
    );
  });
});
