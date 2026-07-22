import * as React from 'react';
import useIsRemoteClusterDeletable from '@odf/core/hooks/useIsRemoteClusterDeletable';
import { ClusterKind, RemoteClusterKind } from '@odf/core/types/scale';
import { k8sDelete, k8sList } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import RemoveRemoteClusterModal from './RemoveRemoteClusterModal';

const mockNavigate = jest.fn();

jest.mock('@odf/core/hooks/useIsRemoteClusterDeletable', () => jest.fn());

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  k8sDelete: jest.fn(),
  k8sList: jest.fn(),
}));

const mockIsRemoteClusterDeletable = useIsRemoteClusterDeletable as jest.Mock;
const mockK8sDelete = k8sDelete as jest.Mock;
const mockK8sList = k8sList as jest.Mock;

const remoteCluster: RemoteClusterKind = {
  apiVersion: 'scale.spectrum.ibm.com/v1beta1',
  kind: 'RemoteCluster',
  metadata: {
    name: 'remote-cluster',
    namespace: 'ibm-spectrum-scale',
    uid: 'remote-cluster-uid',
  },
  spec: {
    gui: {
      secretName: 'test-secret',
      hosts: ['remote.example.com'],
    },
  },
};

const otherRemoteCluster: RemoteClusterKind = {
  ...remoteCluster,
  metadata: {
    ...remoteCluster.metadata,
    name: 'other-remote-cluster',
    uid: 'other-remote-cluster-uid',
  },
};

const localCluster: ClusterKind = {
  apiVersion: 'scale.spectrum.ibm.com/v1beta1',
  kind: 'Cluster',
  metadata: {
    name: 'ibm-spectrum-scale',
    namespace: 'ibm-spectrum-scale',
    uid: 'local-cluster-uid',
  },
  spec: {
    license: {
      accept: true,
      license: 'data-management',
    },
  },
};

const closeModal = jest.fn();
const defaultProps = {
  isOpen: true,
  closeModal,
  extraProps: { resource: remoteCluster },
};

const confirmAndRemove = async () => {
  const user = userEvent.setup();
  await user.type(
    screen.getByRole('textbox', { name: 'Confirm name' }),
    'remote-cluster'
  );
  await user.click(screen.getByRole('button', { name: 'Remove' }));
};

describe('RemoveRemoteClusterModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsRemoteClusterDeletable.mockReturnValue(true);
    mockK8sDelete.mockResolvedValue({});
    mockK8sList.mockResolvedValueOnce([]).mockResolvedValueOnce([localCluster]);
  });

  it('requires the remote cluster name before removal', async () => {
    const user = userEvent.setup();
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    expect(removeButton).toBeDisabled();

    await user.type(
      screen.getByRole('textbox', { name: 'Confirm name' }),
      'remote-cluster'
    );

    expect(removeButton).toBeEnabled();
  });

  it('keeps removal disabled when filesystem eligibility fails', async () => {
    mockIsRemoteClusterDeletable.mockReturnValue(false);
    const user = userEvent.setup();
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    await user.type(
      screen.getByRole('textbox', { name: 'Confirm name' }),
      'remote-cluster'
    );

    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('deletes the remote cluster before the local cluster when it is last', async () => {
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    await confirmAndRemove();

    await waitFor(() => expect(mockK8sDelete).toHaveBeenCalledTimes(2));
    expect(mockK8sDelete).toHaveBeenNthCalledWith(1, {
      model: expect.objectContaining({ kind: 'RemoteCluster' }),
      resource: remoteCluster,
      requestInit: null,
      json: null,
    });
    expect(mockK8sDelete).toHaveBeenNthCalledWith(2, {
      model: expect.objectContaining({ kind: 'Cluster' }),
      resource: localCluster,
      requestInit: null,
      json: null,
    });
    expect(mockK8sDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mockK8sDelete.mock.invocationCallOrder[1]
    );
    expect(closeModal).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/odf/external-systems');
  });

  it('preserves the local cluster when another remote cluster remains', async () => {
    mockK8sList.mockReset().mockResolvedValueOnce([otherRemoteCluster]);
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    await confirmAndRemove();

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(mockK8sDelete).toHaveBeenCalledTimes(1);
    expect(mockK8sList).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/odf/external-systems');
  });

  it('ignores the target in the post-delete remote cluster list', async () => {
    mockK8sList
      .mockReset()
      .mockResolvedValueOnce([remoteCluster])
      .mockResolvedValueOnce([localCluster]);
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    await confirmAndRemove();

    await waitFor(() => expect(mockK8sDelete).toHaveBeenCalledTimes(2));
    expect(mockK8sDelete).toHaveBeenLastCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ kind: 'Cluster' }),
      })
    );
  });

  it('succeeds when the local cluster is already absent', async () => {
    mockK8sList.mockReset().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    await confirmAndRemove();

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(mockK8sDelete).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/odf/external-systems');
  });

  it('keeps the modal open when remote cluster deletion fails', async () => {
    mockK8sDelete.mockRejectedValueOnce(new Error('Forbidden'));
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    await confirmAndRemove();

    await waitFor(() =>
      expect(screen.getByText(/Failed to remove remote cluster/)).toBeVisible()
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the modal open when remaining clusters cannot be listed', async () => {
    mockK8sList.mockReset().mockRejectedValueOnce(new Error('Unavailable'));
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    await confirmAndRemove();

    await waitFor(() =>
      expect(screen.getByText(/Failed to list remote clusters/)).toBeVisible()
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps the modal open when local cluster deletion fails', async () => {
    mockK8sDelete
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Forbidden'));
    render(<RemoveRemoteClusterModal {...defaultProps} />);

    await confirmAndRemove();

    await waitFor(() =>
      expect(
        screen.getByText(/Failed to delete the local Scale cluster/)
      ).toBeVisible()
    );
    expect(closeModal).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
