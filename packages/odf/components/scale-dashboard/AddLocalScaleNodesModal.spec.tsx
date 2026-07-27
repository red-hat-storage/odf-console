import * as React from 'react';
import { useKernelDevelEligibility } from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/hooks/useKernelDevelEligibility';
import { SCALE_DAEMON_NODE_LABEL } from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AddLocalScaleNodesModal from './AddLocalScaleNodesModal';

const mockPatchNode = jest.fn();

jest.mock('@odf/core/hooks', () => ({
  ...jest.requireActual('@odf/core/hooks'),
  useNodesData: jest.fn(),
}));

jest.mock(
  '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/hooks/useKernelDevelEligibility',
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
        <AddLocalScaleNodesModal closeModal={closeModal} isOpen />
      </MemoryRouter>
    );
    return closeModal;
  };

  it('shows worker candidates and disables assigned nodes', () => {
    const cordonedWorker = makeNode('worker-cordoned');
    cordonedWorker.spec.unschedulable = true;
    const taintedWorker = makeNode('worker-tainted');
    taintedWorker.spec.taints = [
      { key: 'dedicated', value: 'other', effect: 'NoSchedule' },
    ];

    (useNodesData as jest.Mock).mockReturnValue([
      [
        makeNode('worker-candidate'),
        cordonedWorker,
        taintedWorker,
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
    expect(screen.getByText('worker-cordoned')).toBeInTheDocument();
    expect(screen.queryByText('worker-tainted')).not.toBeInTheDocument();
    expect(screen.getByText('worker-assigned')).toBeInTheDocument();
    expect(
      screen.getByText('worker-assigned').closest('tr').querySelector('input')
    ).toBeDisabled();
    expect(screen.queryByText('control-plane')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

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

    expect(
      await screen.findByText('Kernel-devel packages verified')
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

  it('keeps the modal open and shows the patch error', async () => {
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
    mockPatchNode.mockRejectedValue(new Error('patch failed'));
    const closeModal = openModal();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(
      await screen.findByText('Unable to add selected nodes')
    ).toBeInTheDocument();
    expect(screen.getByText('patch failed')).toBeInTheDocument();
    expect(closeModal).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });
});
