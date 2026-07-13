import * as React from 'react';
import { SCALE_DAEMON_NODE_LABEL } from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom-v5-compat';
import { useKernelDevelEligibility } from '../create-storage-system/external-systems/CreateScaleSystem/hooks/useKernelDevelEligibility';
import AddLocalScaleNodesModal from './AddLocalScaleNodesModal';

const mockPatchNode = jest.fn();

jest.mock('@odf/core/hooks', () => ({
  ...jest.requireActual('@odf/core/hooks'),
  useNodesData: jest.fn(),
}));

jest.mock(
  '../create-storage-system/external-systems/CreateScaleSystem/hooks/useKernelDevelEligibility',
  () => ({ useKernelDevelEligibility: jest.fn() })
);

jest.mock('@odf/shared/utils', () => ({
  ...jest.requireActual('@odf/shared/utils'),
  k8sPatchByName: (...args) => mockPatchNode(...args),
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({ t: (key: string) => key }),
}));

const makeNode = (
  name: string,
  labels: Record<string, string> = {
    'node-role.kubernetes.io/worker': '',
  }
): NodeData =>
  ({
    apiVersion: 'v1',
    kind: 'Node',
    metadata: { name, uid: name, labels },
    spec: {},
    status: {
      capacity: { cpu: '8', memory: '32Gi' },
    },
  }) as NodeData;

describe('AddLocalScaleNodesModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKernelDevelEligibility as jest.Mock).mockReturnValue({
      areSelectedNodesEligible: false,
      isLoading: false,
      error: '',
      nodesWithoutKernelDevel: [],
    });
  });

  const openModal = (closeModal = jest.fn()) => {
    render(
      <MemoryRouter>
        <AddLocalScaleNodesModal
          closeModal={closeModal}
          isOpen
          systemName="my-scale-system"
        />
      </MemoryRouter>
    );
    return closeModal;
  };

  it('shows only unassigned worker expansion candidates', () => {
    (useNodesData as jest.Mock).mockReturnValue([
      [
        makeNode('worker-candidate'),
        makeNode('worker-assigned', {
          'node-role.kubernetes.io/worker': '',
          [SCALE_DAEMON_NODE_LABEL]: '',
        }),
        makeNode('control-plane', {
          'node-role.kubernetes.io/control-plane': '',
        }),
      ],
      true,
      null,
    ]);

    openModal();

    expect(screen.getByText('worker-candidate')).toBeInTheDocument();
    expect(screen.queryByText('worker-assigned')).not.toBeInTheDocument();
    expect(screen.queryByText('control-plane')).not.toBeInTheDocument();
  });

  it('shows a small empty state when there are no expansion candidates', async () => {
    (useNodesData as jest.Mock).mockReturnValue([[], true, null]);
    const closeModal = openModal();

    expect(screen.getByText('No nodes available to add')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(closeModal).toHaveBeenCalled();
  });

  it('prevents assignment while kernel-devel eligibility is unresolved', async () => {
    (useNodesData as jest.Mock).mockReturnValue([
      [makeNode('worker-candidate')],
      true,
      null,
    ]);
    (useKernelDevelEligibility as jest.Mock).mockImplementation(
      (selectedNodes) => ({
        areSelectedNodesEligible: false,
        isLoading: selectedNodes.length > 0,
        error: '',
        nodesWithoutKernelDevel: [],
      })
    );
    openModal();

    await userEvent.click(screen.getAllByRole('checkbox')[1]);

    expect(
      screen.getByText('Checking kernel-devel packages on selected nodes')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it.each([
    {
      eligibility: {
        areSelectedNodesEligible: false,
        isLoading: false,
        error: 'MachineConfigNode watch failed',
        nodesWithoutKernelDevel: [],
      },
      message:
        'Unable to verify kernel-devel package status MachineConfigNode watch failed',
    },
    {
      eligibility: {
        areSelectedNodesEligible: false,
        isLoading: false,
        error: '',
        nodesWithoutKernelDevel: ['worker-candidate'],
      },
      message:
        'Kernel-devel packages are not installed on all the selected nodes. Apply the MCO before creating the connection to CNSA',
    },
  ])(
    'prevents assignment when eligibility reports: $message',
    async ({ eligibility, message }) => {
      (useNodesData as jest.Mock).mockReturnValue([
        [makeNode('worker-candidate')],
        true,
        null,
      ]);
      (useKernelDevelEligibility as jest.Mock).mockReturnValue(eligibility);
      openModal();

      await userEvent.click(screen.getAllByRole('checkbox')[1]);

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    }
  );

  it('assigns an eligible expansion candidate', async () => {
    (useNodesData as jest.Mock).mockReturnValue([
      [makeNode('worker-candidate')],
      true,
      null,
    ]);
    (useKernelDevelEligibility as jest.Mock).mockImplementation(
      (selectedNodes) => ({
        areSelectedNodesEligible: selectedNodes.length > 0,
        isLoading: false,
        error: '',
        nodesWithoutKernelDevel: [],
      })
    );
    mockPatchNode.mockResolvedValue({});
    const closeModal = openModal();

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await userEvent.click(screen.getAllByRole('checkbox')[1]);

    expect(
      screen.getByText('Kernel-devel packages verified')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(mockPatchNode).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'Node' }),
      'worker-candidate',
      null,
      expect.arrayContaining([
        expect.objectContaining({
          op: 'add',
          path: `/metadata/labels/${SCALE_DAEMON_NODE_LABEL.replace('/', '~1')}`,
          value: '',
        }),
      ])
    );
  });

  it('assigns multiple eligible expansion candidates independently', async () => {
    (useNodesData as jest.Mock).mockReturnValue([
      [makeNode('worker-one'), makeNode('worker-two')],
      true,
      null,
    ]);
    (useKernelDevelEligibility as jest.Mock).mockImplementation(
      (selectedNodes) => ({
        areSelectedNodesEligible: selectedNodes.length > 0,
        isLoading: false,
        error: '',
        nodesWithoutKernelDevel: [],
      })
    );
    mockPatchNode.mockResolvedValue({});
    const closeModal = openModal();

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select all rows' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(mockPatchNode).toHaveBeenCalledTimes(2);
    expect(mockPatchNode.mock.calls.map(([, name]) => name)).toEqual([
      'worker-one',
      'worker-two',
    ]);
  });

  it('keeps failed assignments visible and retries only the failures', async () => {
    (useNodesData as jest.Mock).mockReturnValue([
      [makeNode('worker-success'), makeNode('worker-failed')],
      true,
      null,
    ]);
    (useKernelDevelEligibility as jest.Mock).mockImplementation(
      (selectedNodes) => ({
        areSelectedNodesEligible: selectedNodes.length > 0,
        isLoading: false,
        error: '',
        nodesWithoutKernelDevel: [],
      })
    );
    mockPatchNode.mockImplementation((_model, name) =>
      name === 'worker-failed'
        ? Promise.reject(new Error('patch failed'))
        : Promise.resolve({})
    );
    const closeModal = openModal();

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select all rows' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(screen.queryByText('worker-success')).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole('link', { name: 'worker-failed' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Unable to add selected nodes')
    ).toBeInTheDocument();
    expect(closeModal).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();

    mockPatchNode.mockResolvedValue({});
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    expect(mockPatchNode.mock.calls.map(([, name]) => name)).toEqual([
      'worker-success',
      'worker-failed',
      'worker-failed',
    ]);
  });
});
