import * as React from 'react';
import {
  MirrorPeerConditionReason,
  MirrorPeerConditionType,
  MirrorPeerPhase,
  MirrorPeerPhaseMessage,
} from '@odf/mco/constants';
import { DRPolicyKind, MirrorPeerKind } from '@odf/mco/types';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  deleteDRPolicyByName,
  deleteMirrorPeerByName,
  restoreDRPolicySpec,
} from '../utils/k8s-utils';
import { ClusterPairingProgress } from './cluster-pairing-progress';

jest.mock('../utils/k8s-utils', () => ({
  deleteMirrorPeerByName: jest.fn(() => Promise.resolve()),
  deleteDRPolicyByName: jest.fn(() => Promise.resolve()),
  restoreDRPolicySpec: jest.fn(() => Promise.resolve()),
}));

const mockDeleteMirrorPeerByName = deleteMirrorPeerByName as jest.Mock;
const mockDeleteDRPolicyByName = deleteDRPolicyByName as jest.Mock;
const mockRestoreDRPolicySpec = restoreDRPolicySpec as jest.Mock;

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
  peer: MirrorPeerKind;
  onCancelPairing?: jest.Mock;
  deleteMirrorPeerOnCancel?: boolean;
  deletePolicyOnCancel?: boolean;
  previousPolicySpec?: DRPolicyKind['spec'];
};

const ProgressUnderTest: React.FC<ProgressUnderTestProps> = ({
  peer,
  onCancelPairing = jest.fn(),
  deleteMirrorPeerOnCancel = true,
  deletePolicyOnCancel = true,
  previousPolicySpec,
}) => (
  <ClusterPairingProgress
    mirrorPeerName="mirrorpeer-test"
    mirrorPeers={[peer]}
    mirrorPeersLoaded
    mirrorPeersLoadError={null}
    policyName="policy-test"
    deleteMirrorPeerOnCancel={deleteMirrorPeerOnCancel}
    deletePolicyOnCancel={deletePolicyOnCancel}
    previousPolicySpec={previousPolicySpec}
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
    mockRestoreDRPolicySpec.mockReset();
    mockRestoreDRPolicySpec.mockResolvedValue(undefined);
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
    const { rerender } = render(
      <ProgressUnderTest peer={mirrorPeer(MirrorPeerPhase.Configuring, '')} />
    );

    rerender(<ProgressUnderTest peer={readyPeer} />);
    runProgressTimers();

    expect(
      screen.getByText('Clusters paired successfully')
    ).toBeInTheDocument();
  });

  it('shows the failed view when the MirrorPeer fails before reaching Ready', () => {
    render(<ProgressUnderTest peer={validationFailedPeer} />);
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
    render(<ProgressUnderTest peer={recoverableConfiguringPeer} />);

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
    render(
      <ProgressUnderTest peer={mirrorPeer(MirrorPeerPhase.Configuring, '')} />
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('deletes the newly created DRPolicy and MirrorPeer and returns to the wizard on Cancel', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancelPairing = jest.fn();
    render(
      <ProgressUnderTest
        peer={validationFailedPeer}
        onCancelPairing={onCancelPairing}
      />
    );

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
    render(
      <ProgressUnderTest
        peer={validationFailedPeer}
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
    render(
      <ProgressUnderTest
        peer={validationFailedPeer}
        onCancelPairing={onCancelPairing}
      />
    );

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
    render(
      <ProgressUnderTest
        peer={validationFailedPeer}
        onCancelPairing={onCancelPairing}
      />
    );

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

  it('restores the previous DRPolicy spec on Cancel for updates, then deletes a new MirrorPeer', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancelPairing = jest.fn();
    const previousPolicySpec: DRPolicyKind['spec'] = {
      drClusters: ['east-1', 'west-1'],
      schedulingInterval: '10m',
    };
    render(
      <ProgressUnderTest
        peer={validationFailedPeer}
        onCancelPairing={onCancelPairing}
        deletePolicyOnCancel={false}
        deleteMirrorPeerOnCancel
        previousPolicySpec={previousPolicySpec}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(mockRestoreDRPolicySpec).toHaveBeenCalledWith(
        'policy-test',
        previousPolicySpec
      );
      expect(mockDeleteMirrorPeerByName).toHaveBeenCalledWith(
        'mirrorpeer-test'
      );
      expect(onCancelPairing).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteDRPolicyByName).not.toHaveBeenCalled();
  });

  it('surfaces a restore error and stays on the pairing page when Cancel restore fails', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onCancelPairing = jest.fn();
    const previousPolicySpec: DRPolicyKind['spec'] = {
      drClusters: ['east-1', 'west-1'],
      schedulingInterval: '10m',
    };
    mockRestoreDRPolicySpec.mockRejectedValue(new Error('restore denied'));
    render(
      <ProgressUnderTest
        peer={validationFailedPeer}
        onCancelPairing={onCancelPairing}
        deletePolicyOnCancel={false}
        deleteMirrorPeerOnCancel
        previousPolicySpec={previousPolicySpec}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.getByText('restore denied')).toBeInTheDocument();
    });
    expect(onCancelPairing).not.toHaveBeenCalled();
    expect(mockDeleteMirrorPeerByName).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });
});
