import {
  MachineConfigKind,
  MachineConfigNodeKind,
} from '@odf/core/types/scale';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { renderHook } from '@testing-library/react-hooks';
import { WizardNodeState } from '../../../reducer';
import { useKernelDevelEligibility } from './useKernelDevelEligibility';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResources: jest.fn(),
}));

const makeNode = (name: string): WizardNodeState =>
  ({
    name,
    hostName: name,
    cpu: '4',
    memory: '16Gi',
    zone: 'us-east-1a',
    rack: '',
    uid: name,
    roles: ['worker'],
    labels: {},
    taints: [],
    architecture: 'amd64',
  }) as WizardNodeState;

type WatchResourceMock<T> = {
  data?: T[];
  loaded?: boolean;
  loadError?: unknown;
};

type WatchResourcesMock = {
  machineConfigNodes?: WatchResourceMock<MachineConfigNodeKind>;
  machineConfigs?: WatchResourceMock<MachineConfigKind>;
};

const mockWatchResources = ({
  machineConfigNodes = {},
  machineConfigs = {},
}: WatchResourcesMock = {}) => {
  (useK8sWatchResources as jest.Mock).mockImplementation((resources) =>
    Object.fromEntries(
      Object.entries(resources).map(([key, resource]: [string, any]) => {
        const source = key.startsWith('mcn-')
          ? machineConfigNodes
          : machineConfigs;
        const data = source.data?.find(
          (item) => item.metadata?.name === resource.name
        );

        return [
          key,
          {
            data,
            loaded: source.loaded ?? true,
            loadError: source.loadError ?? null,
          },
        ];
      })
    )
  );
};

describe('useKernelDevelEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports selected nodes as eligible when kernel-devel is installed', () => {
    mockWatchResources({
      machineConfigNodes: {
        data: [
          {
            metadata: { name: 'worker-0' },
            status: { configVersion: { current: 'rendered-worker-a' } },
          },
        ],
      },
      machineConfigs: {
        data: [
          {
            metadata: { name: 'rendered-worker-a' },
            spec: { extensions: ['kernel-devel'] },
          },
        ],
      },
    });

    const selectedNodes = [makeNode('worker-0')];
    const { result } = renderHook(() =>
      useKernelDevelEligibility(selectedNodes)
    );

    expect(useK8sWatchResources).toHaveBeenNthCalledWith(1, {
      'mcn-worker-0': expect.objectContaining({ name: 'worker-0' }),
    });
    expect(result.current.areSelectedNodesEligible).toBe(true);
    expect(result.current.nodesWithoutKernelDevel).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('reports nodes without kernel-devel when extension is absent', () => {
    mockWatchResources({
      machineConfigNodes: {
        data: [
          {
            metadata: { name: 'worker-1' },
            status: { configVersion: { current: 'rendered-worker-b' } },
          },
        ],
      },
      machineConfigs: {
        data: [
          {
            metadata: { name: 'rendered-worker-b' },
            spec: { extensions: [] },
          },
        ],
      },
    });

    const selectedNodes = [makeNode('worker-1')];
    const { result } = renderHook(() =>
      useKernelDevelEligibility(selectedNodes)
    );

    expect(result.current.areSelectedNodesEligible).toBe(false);
    expect(result.current.nodesWithoutKernelDevel).toEqual(['worker-1']);
  });

  it('treats nodes with unresolvable MachineConfig as not installed', () => {
    mockWatchResources({
      machineConfigNodes: {
        data: [
          {
            metadata: { name: 'worker-2' },
            status: { configVersion: { current: 'rendered-worker-missing' } },
          },
        ],
      },
    });

    const selectedNodes = [makeNode('worker-2')];
    const { result } = renderHook(() =>
      useKernelDevelEligibility(selectedNodes)
    );

    expect(result.current.areSelectedNodesEligible).toBe(false);
    expect(result.current.nodesWithoutKernelDevel).toEqual(['worker-2']);
  });

  it('surfaces watch errors from MCO resources', () => {
    mockWatchResources({
      machineConfigNodes: { loadError: { message: 'mcn watch failed' } },
    });

    const selectedNodes = [makeNode('worker-0')];
    const { result } = renderHook(() =>
      useKernelDevelEligibility(selectedNodes)
    );

    expect(result.current.areSelectedNodesEligible).toBe(false);
    expect(result.current.error).toBe('mcn watch failed');
  });

  it('reports isLoading when watches have not loaded', () => {
    mockWatchResources({
      machineConfigNodes: { loaded: false },
      machineConfigs: { loaded: false },
    });

    const selectedNodes = [makeNode('worker-0')];
    const { result } = renderHook(() =>
      useKernelDevelEligibility(selectedNodes)
    );

    expect(result.current.areSelectedNodesEligible).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.nodesWithoutKernelDevel).toEqual([]);
  });

  it('starts watches lazily and keeps them alive after the first selection', () => {
    mockWatchResources({
      machineConfigNodes: {
        data: [
          {
            metadata: { name: 'worker-0' },
            status: { configVersion: { current: 'rendered-worker-a' } },
          },
        ],
      },
      machineConfigs: {
        data: [
          {
            metadata: { name: 'rendered-worker-a' },
            spec: { extensions: ['kernel-devel'] },
          },
        ],
      },
    });

    const { result, rerender } = renderHook(
      ({ selectedNodes }) => useKernelDevelEligibility(selectedNodes),
      { initialProps: { selectedNodes: [] as WizardNodeState[] } }
    );

    expect(useK8sWatchResources).toHaveBeenNthCalledWith(1, {});
    expect(useK8sWatchResources).toHaveBeenNthCalledWith(2, {});
    expect(result.current.isLoading).toBe(false);

    rerender({ selectedNodes: [makeNode('worker-0')] });
    const expectedMachineConfigNodeResources = {
      'mcn-worker-0': expect.objectContaining({
        name: 'worker-0',
        isList: false,
      }),
    };
    const expectedMachineConfigResources = {
      'mc-rendered-worker-a': expect.objectContaining({
        name: 'rendered-worker-a',
        isList: false,
      }),
    };
    expect(useK8sWatchResources).toHaveBeenNthCalledWith(
      3,
      expectedMachineConfigNodeResources
    );
    expect(useK8sWatchResources).toHaveBeenNthCalledWith(
      4,
      expectedMachineConfigResources
    );

    rerender({ selectedNodes: [] });
    expect(useK8sWatchResources).toHaveBeenNthCalledWith(
      5,
      expectedMachineConfigNodeResources
    );
    expect(useK8sWatchResources).toHaveBeenNthCalledWith(
      6,
      expectedMachineConfigResources
    );
    expect(result.current.areSelectedNodesEligible).toBe(false);
    expect(result.current.nodesWithoutKernelDevel).toEqual([]);
  });

  it('only checks selected nodes, ignoring others in the cluster', () => {
    mockWatchResources({
      machineConfigNodes: {
        data: [
          {
            metadata: { name: 'worker-0' },
            status: { configVersion: { current: 'rendered-worker-a' } },
          },
          {
            metadata: { name: 'worker-1' },
            status: { configVersion: { current: 'rendered-worker-b' } },
          },
        ],
      },
      machineConfigs: {
        data: [
          {
            metadata: { name: 'rendered-worker-a' },
            spec: { extensions: ['kernel-devel'] },
          },
          {
            metadata: { name: 'rendered-worker-b' },
            spec: { extensions: [] },
          },
        ],
      },
    });

    // Only select worker-0 which has kernel-devel; worker-1 is missing but not selected
    const selectedNodes = [makeNode('worker-0')];
    const { result } = renderHook(() =>
      useKernelDevelEligibility(selectedNodes)
    );

    expect(result.current.areSelectedNodesEligible).toBe(true);
    expect(result.current.nodesWithoutKernelDevel).toEqual([]);
  });

  it('reevaluates eligibility when the selected nodes change', () => {
    mockWatchResources({
      machineConfigNodes: {
        data: [
          {
            metadata: { name: 'worker-0' },
            status: { configVersion: { current: 'rendered-worker-a' } },
          },
          {
            metadata: { name: 'worker-1' },
            status: { configVersion: { current: 'rendered-worker-b' } },
          },
        ],
      },
      machineConfigs: {
        data: [
          {
            metadata: { name: 'rendered-worker-a' },
            spec: { extensions: ['kernel-devel'] },
          },
          {
            metadata: { name: 'rendered-worker-b' },
            spec: { extensions: [] },
          },
        ],
      },
    });

    const { result, rerender } = renderHook(
      ({ selectedNodes }) => useKernelDevelEligibility(selectedNodes),
      { initialProps: { selectedNodes: [makeNode('worker-1')] } }
    );

    expect(result.current.areSelectedNodesEligible).toBe(false);
    expect(result.current.nodesWithoutKernelDevel).toEqual(['worker-1']);

    rerender({ selectedNodes: [makeNode('worker-0')] });

    expect(result.current.areSelectedNodesEligible).toBe(true);
    expect(result.current.nodesWithoutKernelDevel).toEqual([]);
  });
});
