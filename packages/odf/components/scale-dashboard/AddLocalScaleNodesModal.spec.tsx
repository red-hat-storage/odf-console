import * as React from 'react';
import { useKernelDevelEligibility } from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/hooks/useKernelDevelEligibility';
import { SCALE_DAEMON_NODE_LABEL } from '@odf/core/constants';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import { ClusterKind } from '@odf/core/types/scale';
import { Toleration } from '@odf/shared/types';
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

// Mirrors a cluster produced by the create payload: every taint-sensitive
// section is present and shares the same tolerations.
const makeCluster = (tolerations?: Toleration[]): ClusterKind =>
  ({
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Cluster',
    metadata: { name: 'ibm-spectrum-scale' },
    spec: {
      daemon: { ...(tolerations ? { tolerations } : {}) },
      gui: { ...(tolerations ? { tolerations } : {}) },
      pmcollector: { ...(tolerations ? { tolerations } : {}) },
      grafanaBridge: {
        enablePrometheusExporter: true,
        ...(tolerations ? { tolerations } : {}),
      },
    },
  }) as ClusterKind;

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

  const openModal = (closeModal = jest.fn(), cluster = makeCluster()) => {
    render(
      <MemoryRouter>
        <AddLocalScaleNodesModal
          closeModal={closeModal}
          isOpen
          cluster={cluster}
        />
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
    // Tainted workers are now shown but left unchecked by default.
    const taintedRow = screen.getByText('worker-tainted').closest('tr');
    expect(taintedRow).toBeInTheDocument();
    expect(taintedRow.querySelector('input')).not.toBeChecked();
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

  it('expands the cluster tolerations when a tainted node is added', async () => {
    const taintedWorker = makeNode('worker-tainted');
    taintedWorker.spec.taints = [
      { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
    ];
    (useNodesData as jest.Mock).mockReturnValue([[taintedWorker], true, null]);
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

    // Tainted nodes are unchecked by default; opt into this one.
    await userEvent.click(
      screen.getByText('worker-tainted').closest('tr').querySelector('input')
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    // The Cluster CR is patched so every taint-sensitive component (daemon, GUI,
    // pmcollector, grafana-bridge) can tolerate the new taint.
    const expectedToleration = expect.arrayContaining([
      expect.objectContaining({
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      }),
    ]);
    expect(mockPatchNode).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'Cluster' }),
      'ibm-spectrum-scale',
      null,
      [
        expect.objectContaining({
          op: 'add',
          path: '/spec/daemon/tolerations',
          value: expectedToleration,
        }),
        expect.objectContaining({
          op: 'add',
          path: '/spec/gui/tolerations',
          value: expectedToleration,
        }),
        expect.objectContaining({
          op: 'add',
          path: '/spec/pmcollector/tolerations',
          value: expectedToleration,
        }),
        expect.objectContaining({
          op: 'add',
          path: '/spec/grafanaBridge/tolerations',
          value: expectedToleration,
        }),
      ]
    );
  });

  it('does not patch the cluster when added nodes have no new taints', async () => {
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

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(closeModal).toHaveBeenCalled());
    // Only the node label patch runs; the Cluster CR is left untouched.
    // Filter by model kind rather than using `.not.toHaveBeenCalledWith(...)`
    // with `expect.anything()`: the Cluster patch is invoked with a `null`
    // namespace, which `expect.anything()` does not match, so that form of the
    // assertion would pass even if a Cluster patch had leaked through.
    const clusterPatchCalls = mockPatchNode.mock.calls.filter(
      ([model]) => model?.kind === 'Cluster'
    );
    expect(clusterPatchCalls).toHaveLength(0);
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
