import * as React from 'react';
import { useToastWrapper } from '@odf/shared/hooks';
import {
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Progression } from '../../types';
import CleanUpTestModal from './cleanup-test-modal';

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

const SESSION_START = '2024-01-01T10:00:00Z';

const holdingDRPC = {
  spec: { dryRun: true },
  status: {
    progression: Progression.TestingFailover,
    actionStartTime: SESSION_START,
  },
};

describe('CleanUpTestModal', () => {
  beforeEach(() => {
    k8sPatchMock.mockReset();
    (useToastWrapper as jest.Mock).mockReturnValue(jest.fn());
    useK8sWatchResourceMock.mockReturnValue([holdingDRPC, true, undefined]);
  });

  it('patches clean up and closes on confirm', async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    k8sPatchMock.mockResolvedValue({});
    render(
      <CleanUpTestModal
        isOpen
        closeModal={closeModal}
        extraProps={{
          drpcName: 'app-drpc',
          drpcNamespace: 'app-ns',
          actionStartTime: SESSION_START,
          homeCluster: 'east-1',
          lastAction: '',
          peerCluster: 'west-1',
          currentFailoverCluster: 'west-1',
        }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Clean up test' }));

    const patchData = k8sPatchMock.mock.calls[0][0].data as {
      op: string;
      path: string;
      value?: unknown;
    }[];
    expect(patchData.filter((p) => p.op !== 'test')).toEqual([
      { op: 'replace', path: '/spec/dryRun', value: false },
      { op: 'remove', path: '/spec/action' },
      { op: 'remove', path: '/spec/failoverCluster' },
      { op: 'add', path: '/spec/preferredCluster', value: 'east-1' },
    ]);
    await waitFor(() => expect(closeModal).toHaveBeenCalled());
  });
});
