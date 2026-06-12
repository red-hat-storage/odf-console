import * as React from 'react';
import { FileSystemKind } from '@odf/core/types/scale';
import { useWatchStorageClusters } from '@odf/shared/hooks/useWatchStorageClusters';
import { StorageClusterKind } from '@odf/shared/types';
import {
  useFlag,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom-v5-compat';
import { ExternalSystemsCard } from './ExternalSystemsCard';

jest.mock('@odf/shared/hooks/useWatchStorageClusters', () => ({
  useWatchStorageClusters: jest.fn(),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useFlag: jest.fn(),
  useK8sWatchResource: jest.fn(),
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockWatchClusters = (overrides: Record<string, unknown> = {}) => {
  (useWatchStorageClusters as jest.Mock).mockReturnValue({
    storageClusters: { data: [], loaded: true, loadError: null },
    flashSystemClusters: { data: [], loaded: true, loadError: null },
    remoteClusters: { data: [], loaded: true, loadError: null },
    sanClusters: { data: [], loaded: true, loadError: null },
    ...overrides,
  });
};

const mockFileSystems = (fileSystems: FileSystemKind[] = []) => {
  (useK8sWatchResource as jest.Mock).mockReturnValue([
    fileSystems,
    true,
    undefined,
  ]);
};

const lunGroup = (
  name: string,
  health: 'connected' | 'error' | 'creating'
): FileSystemKind => {
  const base: FileSystemKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Filesystem',
    metadata: { name },
    spec: {
      local: {
        pools: [{ disks: ['disk-1'] }],
        replication: '1-way',
        type: 'shared',
      },
    },
  };

  if (health === 'connected') {
    base.status = {
      conditions: [
        {
          type: 'Success',
          status: 'True',
          reason: 'Ready',
          message: '',
          lastTransitionTime: '2026-01-01T00:00:00Z',
        },
        {
          type: 'Mounted',
          status: 'True',
          reason: 'Ready',
          message: '',
          lastTransitionTime: '2026-01-01T00:00:00Z',
        },
      ],
    };
  } else if (health === 'creating') {
    base.metadata.creationTimestamp = new Date().toISOString();
  } else {
    base.status = {
      conditions: [
        {
          type: 'Success',
          status: 'False',
          reason: 'Failed',
          message: 'failed',
          lastTransitionTime: '2026-01-01T00:00:00Z',
        },
      ],
    };
  }

  return base;
};

const cnsaFilesystem = (
  name: string,
  health: 'connected' | 'error' | 'creating'
): FileSystemKind => {
  const base: FileSystemKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Filesystem',
    metadata: { name },
    spec: {
      remote: {
        cluster: 'remote-cluster-1',
        fs: 'gpfs1',
      },
    },
  };

  if (health === 'connected') {
    base.status = {
      conditions: [
        {
          type: 'Success',
          status: 'True',
          reason: 'Ready',
          message: '',
          lastTransitionTime: '2026-01-01T00:00:00Z',
        },
      ],
    };
  } else if (health === 'creating') {
    base.metadata.creationTimestamp = new Date().toISOString();
  } else {
    base.status = {
      conditions: [
        {
          type: 'Success',
          status: 'False',
          reason: 'Failed',
          message: 'failed',
          lastTransitionTime: '2026-01-01T00:00:00Z',
        },
      ],
    };
  }

  return base;
};

const externalCephCluster = (name: string, phase: string): StorageClusterKind =>
  ({
    metadata: { name, namespace: 'openshift-storage' },
    spec: {
      externalStorage: {
        enable: true,
      },
    },
    status: { phase },
  }) as StorageClusterKind;

const flashCluster = (name: string, phase: string) => ({
  metadata: { name },
  status: { phase },
});

const renderCard = () =>
  render(
    <BrowserRouter>
      <ExternalSystemsCard />
    </BrowserRouter>
  );

describe('ExternalSystemsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFlag as jest.Mock).mockReturnValue(true);
    mockWatchClusters();
    mockFileSystems();
  });

  it('shows empty message when no external systems are connected', () => {
    renderCard();
    expect(
      screen.getByText('No external systems connected')
    ).toBeInTheDocument();
  });

  it('shows loading skeleton while cluster watches are still loading', () => {
    mockWatchClusters({
      storageClusters: { data: [], loaded: false, loadError: null },
      flashSystemClusters: { data: [], loaded: false, loadError: null },
      remoteClusters: { data: [], loaded: false, loadError: null },
      sanClusters: { data: [], loaded: false, loadError: null },
    });
    (useK8sWatchResource as jest.Mock).mockReturnValue([[], false, undefined]);

    renderCard();
    expect(
      screen.getByText('Loading external systems data')
    ).toBeInTheDocument();
  });

  it('renders SAN row with LUN group status counts when only SAN cluster exists', () => {
    mockWatchClusters({
      sanClusters: {
        data: [{ metadata: { name: 'san-cluster' } }],
        loaded: true,
        loadError: null,
      },
    });
    mockFileSystems([
      lunGroup('lun-healthy', 'connected'),
      lunGroup('lun-error', 'error'),
    ]);

    renderCard();

    expect(
      screen.getByText('Storage Area Network LUN groups')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('IBM Scale (CNSA) file systems')
    ).not.toBeInTheDocument();

    const sanRow = screen
      .getByText('Storage Area Network LUN groups')
      .closest('dt');
    const description = sanRow?.nextElementSibling as HTMLElement;
    expect(within(description).getAllByText('1')).toHaveLength(2);
  });

  it('renders SAN row when Cluster exists without RemoteCluster', () => {
    mockWatchClusters({
      sanClusters: {
        data: [{ metadata: { name: 'san-cluster' } }],
        loaded: true,
        loadError: null,
      },
    });
    mockFileSystems([]);

    renderCard();

    expect(
      screen.getByText('Storage Area Network LUN groups')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('IBM Scale (CNSA) file systems')
    ).not.toBeInTheDocument();
  });

  it('renders CNSA row when both RemoteCluster and Cluster CRs exist', () => {
    mockWatchClusters({
      sanClusters: {
        data: [{ metadata: { name: 'local-scale-cluster' } }],
        loaded: true,
        loadError: null,
      },
      remoteClusters: {
        data: [{ metadata: { name: 'remote-cluster-1' } }],
        loaded: true,
        loadError: null,
      },
    });
    mockFileSystems([
      cnsaFilesystem('fs-healthy', 'connected'),
      cnsaFilesystem('fs-error', 'error'),
    ]);

    renderCard();

    expect(
      screen.getByText('IBM Scale (CNSA) file systems')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Storage Area Network LUN groups')
    ).not.toBeInTheDocument();
  });

  it('renders CNSA row with filesystem status counts when remote cluster exists', () => {
    mockWatchClusters({
      remoteClusters: {
        data: [{ metadata: { name: 'remote-cluster-1' } }],
        loaded: true,
        loadError: null,
      },
    });
    mockFileSystems([
      cnsaFilesystem('fs-healthy', 'connected'),
      cnsaFilesystem('fs-error', 'error'),
    ]);

    renderCard();

    expect(
      screen.getByText('IBM Scale (CNSA) file systems')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Storage Area Network LUN groups')
    ).not.toBeInTheDocument();
  });

  it('sorts connected system rows alphabetically by label', () => {
    mockWatchClusters({
      remoteClusters: {
        data: [{ metadata: { name: 'remote-cluster-1' } }],
        loaded: true,
        loadError: null,
      },
      flashSystemClusters: {
        data: [flashCluster('flash-1', 'Ready')],
        loaded: true,
        loadError: null,
      },
      storageClusters: {
        data: [externalCephCluster('ceph-ext', 'Ready')],
        loaded: true,
        loadError: null,
      },
    });
    mockFileSystems([cnsaFilesystem('fs-1', 'connected')]);

    renderCard();

    const labels = screen
      .getAllByRole('term')
      .map((node) => node.textContent?.trim());
    expect(labels).toEqual([
      'IBM FlashSystem clusters',
      'IBM Scale (CNSA) file systems',
      'Red Hat Ceph clusters',
    ]);
  });

  it('renders view external systems link', () => {
    renderCard();
    expect(screen.getByText('View external systems')).toBeInTheDocument();
  });
});
