import * as React from 'react';
import { DRActionType } from '@odf/mco/constants';
import { useModalWrapper } from '@odf/shared';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import {
  clearTestDryRunPending,
  markTestDryRunCleared,
} from '../../utils/test-failover';
import {
  CleanUpTestModal,
  ConvertTestFailoverModal,
  TestFailoverHoldAlert,
} from './test-failover-actions';

jest.mock('@odf/shared', () => ({
  ...jest.requireActual('@odf/shared'),
  useModalWrapper: jest.fn(),
}));

const launcher = jest.fn();
const onConvert = jest.fn();
const onCleanUp = jest.fn();

const renderAlert = (
  opts: {
    homeCluster?: string;
    peerCluster?: string;
    actionStartTime?: string;
    dryRun?: boolean;
    lastAction?: string;
  } = {}
) => {
  const {
    homeCluster = 'east-1',
    peerCluster = '',
    actionStartTime = '2024-01-01T10:00:00Z',
    dryRun = true,
  } = opts;
  const lastAction = 'lastAction' in opts ? opts.lastAction : '';

  return render(
    <TestFailoverHoldAlert
      drpcName="app-drpc"
      drpcNamespace="app-ns"
      homeCluster={homeCluster}
      peerCluster={peerCluster}
      actionStartTime={actionStartTime}
      lastAction={lastAction}
      dryRun={dryRun}
      onConvert={onConvert}
      onCleanUp={onCleanUp}
    />
  );
};

describe('TestFailoverHoldAlert', () => {
  beforeEach(() => {
    launcher.mockReset();
    onConvert.mockReset();
    onCleanUp.mockReset();
    (useModalWrapper as jest.Mock).mockReturnValue(launcher);
  });

  it('launches Convert and Clean up modals by identity', async () => {
    const user = userEvent.setup();
    renderAlert();

    await user.click(
      screen.getByRole('button', { name: 'Convert to real failover' })
    );
    expect(launcher).toHaveBeenCalledWith(
      ConvertTestFailoverModal,
      expect.objectContaining({
        extraProps: expect.not.objectContaining({
          homeCluster: expect.anything(),
        }),
      })
    );

    launcher.mockReset();
    await user.click(screen.getByRole('button', { name: 'Clean up test' }));
    expect(launcher).toHaveBeenCalledWith(
      CleanUpTestModal,
      expect.objectContaining({
        extraProps: expect.objectContaining({
          homeCluster: 'east-1',
          lastAction: '',
        }),
      })
    );
  });

  it('disables Clean up with helper text when restore is unsafe or home is missing', () => {
    const { unmount } = renderAlert({
      homeCluster: 'west-1',
      peerCluster: '',
      lastAction: DRActionType.FAILOVER,
    });
    expect(
      screen.getByRole('button', { name: 'Clean up test' })
    ).toBeDisabled();
    expect(
      screen.getByText(
        /Clean up is unavailable because the pre-test placement cannot be restored/
      )
    ).toBeInTheDocument();
    unmount();

    renderAlert({ homeCluster: '' });
    expect(
      screen.getByRole('button', { name: 'Clean up test' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Convert to real failover' })
    ).toBeEnabled();
    expect(
      screen.getByText(
        /The application deployment cluster could not be resolved/
      )
    ).toBeInTheDocument();
  });

  it('hides the hold buttons after confirm while the watch still has dryRun', () => {
    markTestDryRunCleared('app-ns', 'app-drpc', '2024-01-01T10:00:00Z');
    renderAlert({ dryRun: true });
    expect(
      screen.getByText(
        'Your request is being processed. This may take a few moments. No further action is needed.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Convert to real failover' })
    ).not.toBeInTheDocument();
    clearTestDryRunPending('app-ns', 'app-drpc', '2024-01-01T10:00:00Z');
  });

  it('shows a processing message instead of buttons after dryRun clears', () => {
    renderAlert({ dryRun: false, actionStartTime: '' });
    expect(
      screen.getByText(
        'Your request is being processed. This may take a few moments. No further action is needed.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Convert to real failover' })
    ).not.toBeInTheDocument();
  });
});
