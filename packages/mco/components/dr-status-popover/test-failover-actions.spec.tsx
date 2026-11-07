import * as React from 'react';
import { useModalWrapper } from '@odf/shared';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TestFailoverHoldAlert } from './test-failover-actions';

jest.mock('@odf/shared', () => ({
  ...jest.requireActual('@odf/shared'),
  useModalWrapper: jest.fn(),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk/lib/api/core-api', () => ({
  ...jest.requireActual(
    '@openshift-console/dynamic-plugin-sdk/lib/api/core-api'
  ),
  k8sPatch: jest.fn(),
}));

const k8sPatchMock = k8sPatch as jest.Mock;
const launcher = jest.fn();

const onConvert = jest.fn();

const renderAlert = (homeCluster = 'east-1', dryRun = true) =>
  render(
    <TestFailoverHoldAlert
      drpcName="app-drpc"
      drpcNamespace="app-ns"
      homeCluster={homeCluster}
      dryRun={dryRun}
      onConvert={onConvert}
    />
  );

describe('TestFailoverHoldAlert', () => {
  beforeEach(() => {
    k8sPatchMock.mockReset();
    launcher.mockReset();
    onConvert.mockReset();
    (useModalWrapper as jest.Mock).mockReturnValue(launcher);
  });

  it('opens the convert confirmation without patching', async () => {
    const user = userEvent.setup();
    renderAlert();

    await user.click(
      screen.getByRole('button', { name: 'Convert to real failover' })
    );

    expect(launcher).toHaveBeenCalledWith(expect.anything(), {
      isOpen: true,
      extraProps: { drpcName: 'app-drpc', drpcNamespace: 'app-ns' },
    });
    expect(onConvert).toHaveBeenCalled();
    expect(k8sPatchMock).not.toHaveBeenCalled();
  });

  it('cleans up the test back to the home cluster', async () => {
    const user = userEvent.setup();
    k8sPatchMock.mockResolvedValue({});
    renderAlert();

    await user.click(screen.getByRole('button', { name: 'Clean up test' }));

    expect(k8sPatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: { metadata: { name: 'app-drpc', namespace: 'app-ns' } },
        data: [
          { op: 'test', path: '/spec/dryRun', value: true },
          { op: 'replace', path: '/spec/dryRun', value: false },
          { op: 'remove', path: '/spec/action' },
          { op: 'add', path: '/spec/preferredCluster', value: 'east-1' },
        ],
      })
    );
    expect(
      screen.getByRole('button', { name: /Clean up test/ })
    ).toBeDisabled();
  });

  it('shows the error when clean up fails', async () => {
    const user = userEvent.setup();
    k8sPatchMock.mockRejectedValue(new Error('test op failed'));
    renderAlert();

    await user.click(screen.getByRole('button', { name: 'Clean up test' }));

    expect(await screen.findByText('test op failed')).toBeInTheDocument();
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clean up test' })).toBeEnabled();
  });

  it('disables clean up when the home cluster is unknown', () => {
    renderAlert('');

    expect(
      screen.getByRole('button', { name: 'Clean up test' })
    ).toBeDisabled();
  });

  it('disables both actions once dryRun is cleared', () => {
    renderAlert('east-1', false);

    expect(
      screen.getByRole('button', { name: 'Convert to real failover' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Clean up test' })
    ).toBeDisabled();
  });
});
