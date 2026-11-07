import * as React from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ConvertTestFailoverModal from './convert-test-failover-modal';

jest.mock('@openshift-console/dynamic-plugin-sdk/lib/api/core-api', () => ({
  ...jest.requireActual(
    '@openshift-console/dynamic-plugin-sdk/lib/api/core-api'
  ),
  k8sPatch: jest.fn(),
}));

const k8sPatchMock = k8sPatch as jest.Mock;

const renderModal = (closeModal = jest.fn()) =>
  render(
    <ConvertTestFailoverModal
      isOpen
      closeModal={closeModal}
      extraProps={{ drpcName: 'app-drpc', drpcNamespace: 'app-ns' }}
    />
  );

describe('ConvertTestFailoverModal', () => {
  beforeEach(() => {
    k8sPatchMock.mockReset();
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
        'Converting to Real Failover transitions the workload to the selected target cluster and stops active replication between clusters.'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(k8sPatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: { metadata: { name: 'app-drpc', namespace: 'app-ns' } },
        data: [
          { op: 'test', path: '/spec/dryRun', value: true },
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
});
