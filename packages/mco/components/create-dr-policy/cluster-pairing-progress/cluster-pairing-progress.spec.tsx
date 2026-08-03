import * as React from 'react';
import {
  MirrorPeerConditionReason,
  MirrorPeerConditionType,
  MirrorPeerPhase,
  MirrorPeerPhaseMessage,
} from '@odf/mco/constants';
import { MirrorPeerKind } from '@odf/mco/types';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  deleteDRPolicyByName,
  deleteMirrorPeerByName,
} from '../utils/k8s-utils';
import { ClusterPairingProgress } from './cluster-pairing-progress';

type WatchResult = [MirrorPeerKind, boolean, unknown];

let watchResult: WatchResult;

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(() => watchResult),
}));

jest.mock('../utils/k8s-utils', () => ({
  deleteMirrorPeerByName: jest.fn(() => Promise.resolve()),
  deleteDRPolicyByName: jest.fn(() => Promise.resolve()),
}));

const mockDeleteMirrorPeerByName = deleteMirrorPeerByName as jest.Mock;
const mockDeleteDRPolicyByName = deleteDRPolicyByName as jest.Mock;

type MirrorPeerConditions = NonNullable<MirrorPeerKind['status']>['conditions'];

const mirrorPeer = (
  phase: MirrorPeerPhase,
  message: string,
  conditions: MirrorPeerConditions = []
): MirrorPeerKind =>
  ({
    apiVersion: 'multicluster.odf.openshift.io/v1alpha1',
    kind: 'MirrorPeer',
    metadata: { name: 'mirrorpeer-test' },
    status: { phase, message, conditions },
  }) as MirrorPeerKind;

const readyPeer = mirrorPeer(
  MirrorPeerPhase.Ready,
  MirrorPeerPhaseMessage.MirrorPeerReady,
  [
    {
      type: MirrorPeerConditionType.Configured,
      status: 'True',
      reason: MirrorPeerConditionReason.MirrorPeerReady,
      message: 'setup completed',
    },
  ] as MirrorPeerConditions
);

const validationFailedPeer = mirrorPeer(
  MirrorPeerPhase.Failed,
  MirrorPeerPhaseMessage.ValidationFailed,
  [
    {
      type: MirrorPeerConditionType.Validated,
      status: 'False',
      reason: MirrorPeerConditionReason.ValidationFailed,
      message: 'validation error',
    },
  ] as MirrorPeerConditions
);

const recoverableConfiguringPeer = mirrorPeer(
  MirrorPeerPhase.Configuring,
  MirrorPeerPhaseMessage.ConfigurationFailed,
  [
    {
      type: MirrorPeerConditionType.Configured,
      status: 'False',
      reason: MirrorPeerConditionReason.ConfigurationFailed,
      message: 'configuration error',
    },
  ] as MirrorPeerConditions
);

type ProgressUnderTestProps = {
  onCancelPairing?: jest.Mock;
  deleteMirrorPeerOnCancel?: boolean;
  deletePolicyOnCancel?: boolean;
};

const ProgressUnderTest: React.FC<ProgressUnderTestProps> = ({
  onCancelPairing = jest.fn(),
  deleteMirrorPeerOnCancel = true,
  deletePolicyOnCancel = true,
}) => (
  <ClusterPairingProgress
    mirrorPeerName="mirrorpeer-test"
    policyName="policy-test"
    deleteMirrorPeerOnCancel={deleteMirrorPeerOnCancel}
    deletePolicyOnCancel={deletePolicyOnCancel}
    onViewPolicy={jest.fn()}
    onClose={jest.fn()}
    onCancelPairing={onCancelPairing}
  />
);

describe('ClusterPairingProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDeleteMirrorPeerByName.mockReset();
    mockDeleteMirrorPeerByName.mockResolvedValue(undefined);
    mockDeleteDRPolicyByName.mockReset();
    mockDeleteDRPolicyByName.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const runProgressTimers = () => {
    for (let tick = 0; tick < 10; tick++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
  };

  it('shows the success page once the MirrorPeer reaches Ready', () => {
    watchResult = [mirrorPeer(MirrorPeerPhase.Configuring, ''), true, null];
    const { rerender } = render(<ProgressUnderTest />);

    watchResult = [readyPeer, true, null];
    rerender(<ProgressUnderTest />);
    runProgressTimers();

    expect(
      screen.getByText('Clusters paired successfully')
    ).toBeInTheDocument();
  });

  it('does not fall back to the failed view when a watch update flaps after Ready', () => {
    watchResult = [readyPeer, true, null];
    const { rerender } = render(<ProgressUnderTest />);

    watchResult = [validationFailedPeer, true, null];
    rerender(<ProgressUnderTest />);

    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    expect(
      screen.queryByText(MirrorPeerPhaseMessage.ValidationFailed)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel' })
    ).not.toBeInTheDocument();

    runProgressTimers();

    expect(
      screen.getByText('Clusters paired successfully')
    ).toBeInTheDocument();
  });

  it('keeps the success page when the watch reports an error after Ready', () => {
    watchResult = [readyPeer, true, null];
    const { rerender } = render(<ProgressUnderTest />);
    runProgressTimers();

    watchResult = [readyPeer, false, new Error('watch dropped')];
    rerender(<ProgressUnderTest />);

    expect(
      screen.getByText('Clusters paired successfully')
    ).toBeInTheDocument();
  });

  it('shows the failed view when the MirrorPeer fails before reaching Ready', () => {
    watchResult = [validationFailedPeer, true, null];
    render(<ProgressUnderTest />);
    runProgressTimers();

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(
      screen.getByText(MirrorPeerPhaseMessage.ValidationFailed)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(
      screen.queryByText('Clusters paired successfully')
    ).not.toBeInTheDocument();
  });

  it('keeps Configuring chrome for recoverable failures and still offers Cancel', () => {
    watchResult = [recoverableConfiguringPeer, true, null];
    render(<ProgressUnderTest />);

    expect(screen.getByText('Configuring')).toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    expect(
      screen.getByText(MirrorPeerPhaseMessage.ConfigurationFailed)
    ).toBeInTheDocument();
    expect(screen.getByText(/Error Reason:/)).toBeInTheDocument();
    expect(screen.getByText(/Error Message:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('offers Cancel while pairing is still progressing', () => {
    watchResult = [mirrorPeer(MirrorPeerPhase.Configuring, ''), true, null];
    render(<ProgressUnderTest />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('deletes the newly created DRPolicy and MirrorPeer and returns to the wizard on Cancel', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancelPairing = jest.fn();
    watchResult = [validationFailedPeer, true, null];
    render(<ProgressUnderTest onCancelPairing={onCancelPairing} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(mockDeleteDRPolicyByName).toHaveBeenCalledWith('policy-test');
      expect(mockDeleteMirrorPeerByName).toHaveBeenCalledWith(
        'mirrorpeer-test'
      );
      expect(onCancelPairing).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps resources this run did not create when Cancel is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancelPairing = jest.fn();
    watchResult = [validationFailedPeer, true, null];
    render(
      <ProgressUnderTest
        onCancelPairing={onCancelPairing}
        deleteMirrorPeerOnCancel={false}
        deletePolicyOnCancel={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(onCancelPairing).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteDRPolicyByName).not.toHaveBeenCalled();
    expect(mockDeleteMirrorPeerByName).not.toHaveBeenCalled();
  });

  it('surfaces a delete error and stays on the pairing page when Cancel fails', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancelPairing = jest.fn();
    mockDeleteMirrorPeerByName.mockRejectedValue(new Error('delete denied'));
    watchResult = [validationFailedPeer, true, null];
    render(<ProgressUnderTest onCancelPairing={onCancelPairing} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.getByText('delete denied')).toBeInTheDocument();
    });
    expect(onCancelPairing).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('does not repeat a successful delete when a retried Cancel follows a partial failure', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancelPairing = jest.fn();
    mockDeleteMirrorPeerByName.mockRejectedValueOnce(
      new Error('delete denied')
    );
    watchResult = [validationFailedPeer, true, null];
    render(<ProgressUnderTest onCancelPairing={onCancelPairing} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.getByText('delete denied')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(onCancelPairing).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteDRPolicyByName).toHaveBeenCalledTimes(1);
    expect(mockDeleteMirrorPeerByName).toHaveBeenCalledTimes(2);
  });
});
