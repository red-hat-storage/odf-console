import * as React from 'react';
import {
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Progression } from '../../types';
import ConvertTestFailoverModal from './convert-test-failover-modal';

jest.mock('@openshift-console/dynamic-plugin-sdk/lib/api/core-api', () => ({
  ...jest.requireActual(
    '@openshift-console/dynamic-plugin-sdk/lib/api/core-api'
  ),
  k8sPatch: jest.fn(),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResource: jest.fn(),
}));

const k8sPatchMock = k8sPatch as jest.Mock;
const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;

const SESSION_START = '2024-01-01T10:00:00Z';

const holdingDRPC = {
  spec: { dryRun: true },
  status: {
    progression: Progression.TestingFailover,
    actionStartTime: SESSION_START,
  },
};

const renderModal = (
  closeModal = jest.fn(),
  actionStartTime: string = SESSION_START
) =>
  render(
    <ConvertTestFailoverModal
      isOpen
      closeModal={closeModal}
      extraProps={{
        drpcName: 'app-drpc',
        drpcNamespace: 'app-ns',
        actionStartTime,
      }}
    />
  );

describe('ConvertTestFailoverModal', () => {
  beforeEach(() => {
    k8sPatchMock.mockReset();
    useK8sWatchResourceMock.mockReturnValue([holdingDRPC, true, undefined]);
  });

  it('converts the test to a real failover', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    k8sPatchMock.mockResolvedValue({});
    renderModal(closeModal);

    expect(
      screen.getByRole('dialog', { name: /Convert to real failover/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Recommended only when the primary cluster is down.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Promotes the test application already running on the target cluster to production and makes the failover permanent.'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(k8sPatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: { metadata: { name: 'app-drpc', namespace: 'app-ns' } },
        data: [
          { op: 'test', path: '/spec/dryRun', value: true },
          {
            op: 'test',
            path: '/status/progression',
            value: Progression.TestingFailover,
          },
          {
            op: 'test',
            path: '/status/actionStartTime',
            value: SESSION_START,
          },
          { op: 'replace', path: '/spec/dryRun', value: false },
        ],
      })
    );
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
  });

  it('closes without patching on cancel', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    renderModal(closeModal);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(closeModal).toHaveBeenCalled();
    expect(k8sPatchMock).not.toHaveBeenCalled();
  });

  it('shows the error and stays open when the patch fails', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    k8sPatchMock.mockRejectedValue(new Error('test op failed'));
    renderModal(closeModal);

    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByText('test op failed')).toBeInTheDocument();
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert' })).toBeEnabled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('does not close from the dialog control while the patch is in flight', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    let patchResolve: () => void = () => undefined;
    k8sPatchMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          patchResolve = resolve;
        })
    );
    renderModal(closeModal);

    await user.click(screen.getByRole('button', { name: 'Convert' }));
    await user.click(screen.getByRole('button', { name: /Close/i }));

    expect(closeModal).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(patchResolve).toEqual(expect.any(Function));
  });

  it('stays open until the DRPC watch has loaded', async () => {
    const closeModal = jest.fn();
    useK8sWatchResourceMock.mockReturnValue([undefined, false, undefined]);
    renderModal(closeModal);

    expect(
      screen.getByRole('dialog', { name: /Convert to real failover/ })
    ).toBeInTheDocument();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('shows the watch error and keeps Convert disabled', () => {
    const closeModal = jest.fn();
    useK8sWatchResourceMock.mockReturnValue([
      undefined,
      true,
      new Error('watch failed'),
    ]);
    renderModal(closeModal);

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByText('watch failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled();
    expect(closeModal).not.toHaveBeenCalled();
  });

  it('closes when the watched DRPC has left the test hold', async () => {
    const closeModal = jest.fn();
    useK8sWatchResourceMock.mockReturnValue([
      {
        spec: { dryRun: false },
        status: { progression: Progression.Completed },
      },
      true,
      undefined,
    ]);
    renderModal(closeModal);

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(k8sPatchMock).not.toHaveBeenCalled();
  });

  it('closes when clean up cleared dryRun while progression is still TestingFailover', async () => {
    const closeModal = jest.fn();
    useK8sWatchResourceMock.mockReturnValue([
      {
        spec: { dryRun: false },
        status: {
          progression: Progression.TestingFailover,
          actionStartTime: SESSION_START,
        },
      },
      true,
      undefined,
    ]);
    renderModal(closeModal);

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(k8sPatchMock).not.toHaveBeenCalled();
  });

  it('does not close a patch in flight when the hold ends', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    let patchResolve: () => void = () => undefined;
    k8sPatchMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          patchResolve = resolve;
        })
    );
    const view = renderModal(closeModal);

    await user.click(screen.getByRole('button', { name: 'Convert' }));
    useK8sWatchResourceMock.mockReturnValue([
      {
        spec: { dryRun: false },
        status: { progression: Progression.Completed },
      },
      true,
      undefined,
    ]);
    view.rerender(
      <ConvertTestFailoverModal
        isOpen
        closeModal={closeModal}
        extraProps={{
          drpcName: 'app-drpc',
          drpcNamespace: 'app-ns',
          actionStartTime: SESSION_START,
        }}
      />
    );

    expect(closeModal).not.toHaveBeenCalled();
    expect(patchResolve).toEqual(expect.any(Function));
  });

  it('closes when a later test reaches the hold after a missed transition', async () => {
    const closeModal = jest.fn();
    const view = renderModal(closeModal);

    useK8sWatchResourceMock.mockReturnValue([
      {
        spec: { dryRun: true },
        status: {
          progression: Progression.TestingFailover,
          actionStartTime: '2024-01-01T12:00:00Z',
        },
      },
      true,
      undefined,
    ]);
    view.rerender(
      <ConvertTestFailoverModal
        isOpen
        closeModal={closeModal}
        extraProps={{
          drpcName: 'app-drpc',
          drpcNamespace: 'app-ns',
          actionStartTime: SESSION_START,
        }}
      />
    );

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(k8sPatchMock).not.toHaveBeenCalled();
  });

  it('does not adopt a watched start time when launched without one', async () => {
    const closeModal = jest.fn();
    useK8sWatchResourceMock.mockReturnValue([
      {
        spec: { dryRun: true },
        status: {
          progression: Progression.TestingFailover,
          actionStartTime: '2024-01-01T12:00:00Z',
        },
      },
      true,
      undefined,
    ]);
    renderModal(closeModal, '');

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled();
    expect(k8sPatchMock).not.toHaveBeenCalled();
  });
});
