import * as React from 'react';
import { useToastWrapper } from '@odf/shared/hooks';
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

jest.mock('@odf/shared/hooks', () => ({
  ...jest.requireActual('@odf/shared/hooks'),
  useToastWrapper: jest.fn(),
}));

const k8sPatchMock = k8sPatch as jest.Mock;
const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;
const addToast = jest.fn();

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
    addToast.mockReset();
    (useToastWrapper as jest.Mock).mockReturnValue(addToast);
    useK8sWatchResourceMock.mockReturnValue([holdingDRPC, true, undefined]);
  });

  it('converts the test to a real failover', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    k8sPatchMock.mockResolvedValue({});
    renderModal(closeModal);

    await user.click(screen.getByRole('button', { name: 'Convert' }));

    const patchData = k8sPatchMock.mock.calls[0][0].data as {
      op: string;
      path: string;
      value?: unknown;
    }[];
    expect(patchData.filter((p) => p.op !== 'test')).toEqual([
      { op: 'replace', path: '/spec/dryRun', value: false },
    ]);
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
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
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'info',
        title:
          'Convert is no longer available because a newer test session is in progress.',
      })
    );
  });
});
