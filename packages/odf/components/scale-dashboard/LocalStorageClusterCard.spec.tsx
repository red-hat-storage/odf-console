import * as React from 'react';
import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  IBM_SCALE_NAMESPACE,
  SCALE_DAEMON_NODE_LABEL,
} from '@odf/core/constants';
import { ClusterKind, EncryptionConfigKind } from '@odf/core/types/scale';
import { NodeKind } from '@odf/shared/types';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import LocalStorageClusterCard from './LocalStorageClusterCard';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  useK8sWatchResources: jest.fn(),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk-internal', () => ({
  ResourceInventoryItem: (props) => (
    <div data-test={props.dataTest}>
      {props.isLoading ? (
        <span>Loading...</span>
      ) : props.error ? (
        <span>Error</span>
      ) : (
        <a href={props.basePath}>{props.resources?.length} Nodes</a>
      )}
    </div>
  ),
}));

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{{ ${k} }}`, String(v)),
          key
        );
      }
      return key;
    },
  }),
}));

const makeNode = (name: string, labels: Record<string, string>): NodeKind =>
  ({
    apiVersion: 'v1',
    kind: 'Node',
    metadata: { name, labels, uid: name },
    spec: {},
  }) as NodeKind;

const scaleNode = (name: string) =>
  makeNode(name, { [SCALE_DAEMON_NODE_LABEL]: '' });

const systemName = 'my-scale-system';

const makeCluster = (name: string): ClusterKind => ({
  apiVersion: 'scale.spectrum.ibm.com/v1beta1',
  kind: 'Cluster',
  metadata: { name, uid: name, creationTimestamp: '2026-01-01T00:00:00Z' },
  spec: {
    license: { accept: true, license: 'data-management' },
  },
});

const makeEncryptionConfig = (name: string): EncryptionConfigKind => ({
  apiVersion: 'scale.spectrum.ibm.com/v1beta1',
  kind: 'EncryptionConfig',
  metadata: {
    name,
    namespace: 'ibm-spectrum-scale',
    uid: name,
    creationTimestamp: '2026-01-01T00:00:00Z',
  },
  spec: {
    server: 'keyserver.example.com',
    tenant: 'test-tenant',
    client: 'test-client',
    secret: 'test-secret',
  },
});

type SetupMocksOptions = {
  cluster?: ClusterKind | null;
  clusterLoaded?: boolean;
  clusterLoadError?: unknown;
  nodes?: NodeKind[];
  nodesLoaded?: boolean;
  nodesLoadError?: unknown;
  encryptionConfig?: EncryptionConfigKind | null;
  encryptionConfigLoaded?: boolean;
  encryptionConfigLoadError?: unknown;
};

const setupMocks = ({
  cluster = makeCluster(IBM_SCALE_LOCAL_CLUSTER_NAME),
  clusterLoaded = true,
  clusterLoadError,
  nodes = [],
  nodesLoaded = true,
  nodesLoadError,
  encryptionConfig = null,
  encryptionConfigLoaded = true,
  encryptionConfigLoadError,
}: SetupMocksOptions = {}) => {
  (useK8sWatchResources as jest.Mock).mockReturnValue({
    cluster: {
      data: cluster,
      loaded: clusterLoaded,
      loadError: clusterLoadError ?? null,
    },
    nodes: {
      data: nodes,
      loaded: nodesLoaded,
      loadError: nodesLoadError ?? null,
    },
    encryptionConfig: {
      data: encryptionConfig,
      loaded: encryptionConfigLoaded,
      loadError: encryptionConfigLoadError ?? null,
    },
  });
};

const renderCard = () =>
  render(
    <MemoryRouter initialEntries={[`/${systemName}`]}>
      <Routes>
        <Route path="/:systemName" element={<LocalStorageClusterCard />} />
      </Routes>
    </MemoryRouter>
  );

describe('LocalStorageClusterCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the card title', () => {
    setupMocks();
    renderCard();
    expect(screen.getByText('Local StorageCluster')).toBeInTheDocument();
  });

  describe('Name field', () => {
    it('should watch the single local cluster resource', () => {
      setupMocks();
      renderCard();

      expect(useK8sWatchResources).toHaveBeenCalledWith(
        expect.objectContaining({
          cluster: expect.objectContaining({
            name: IBM_SCALE_LOCAL_CLUSTER_NAME,
            namespace: IBM_SCALE_NAMESPACE,
            isList: false,
          }),
        })
      );
    });

    it('should display the cluster name', () => {
      setupMocks({ cluster: makeCluster('my-scale-cluster') });
      renderCard();
      expect(screen.getByText('my-scale-cluster')).toBeInTheDocument();
    });

    it('should display N/A when cluster does not exist', () => {
      setupMocks({ cluster: null });
      renderCard();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should display a skeleton while loading', () => {
      setupMocks({ clusterLoaded: false });
      const { container } = renderCard();
      expect(container.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('-')).not.toBeInTheDocument();
      expect(screen.queryByText('N/A')).not.toBeInTheDocument();
    });

    it('should display N/A on error', () => {
      setupMocks({
        clusterLoaded: false,
        clusterLoadError: new Error('failed'),
      });
      renderCard();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Node inventory', () => {
    it('should watch only nodes selected for the local cluster', () => {
      setupMocks();
      renderCard();

      expect(useK8sWatchResources).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: expect.objectContaining({
            kind: 'Node',
            isList: true,
            selector: {
              matchExpressions: [
                { key: SCALE_DAEMON_NODE_LABEL, operator: 'Exists' },
              ],
            },
          }),
        })
      );
    });

    it('should display the count of nodes returned by the label-selector watch', () => {
      setupMocks({
        nodes: [scaleNode('node-1'), scaleNode('node-2'), scaleNode('node-3')],
      });
      renderCard();
      expect(screen.getByText('3 Nodes')).toBeInTheDocument();
    });

    it('should show 0 nodes when the watch returns an empty list', () => {
      setupMocks({ nodes: [] });
      renderCard();
      expect(screen.getByText('0 Nodes')).toBeInTheDocument();
    });

    it('should show loading state while nodes load', () => {
      setupMocks({ nodesLoaded: false });
      renderCard();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error state on load failure', () => {
      setupMocks({ nodesLoadError: new Error('forbidden') });
      renderCard();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should link to the Nodes page with the local cluster label filter', () => {
      setupMocks({ nodes: [scaleNode('node-1')] });
      renderCard();
      const link = screen.getByRole('link', { name: '1 Nodes' });
      expect(link).toHaveAttribute(
        'href',
        `/k8s/cluster/nodes?label=${encodeURIComponent(`${SCALE_DAEMON_NODE_LABEL}=`)}`
      );
    });
  });

  describe('Encryption field', () => {
    it('should watch the single remote cluster encryption config', () => {
      setupMocks();
      renderCard();

      expect(useK8sWatchResources).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptionConfig: expect.objectContaining({
            name: `${systemName}-encryption-config`,
            namespace: IBM_SCALE_NAMESPACE,
            isList: false,
          }),
        })
      );
    });

    it('should show Disabled when no EncryptionConfig exists', () => {
      setupMocks({
        encryptionConfig: null,
        encryptionConfigLoaded: false,
        encryptionConfigLoadError: { response: { status: 404 } },
      });
      renderCard();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('should show N/A when the EncryptionConfig watch fails', () => {
      setupMocks({
        encryptionConfig: null,
        encryptionConfigLoaded: false,
        encryptionConfigLoadError: { response: { status: 403 } },
      });
      renderCard();
      expect(screen.getByText('N/A')).toBeInTheDocument();
      expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
    });

    it('should show Enabled when EncryptionConfig exists', () => {
      setupMocks({
        encryptionConfig: makeEncryptionConfig('my-encryption'),
      });
      renderCard();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('should show a skeleton while loading', () => {
      setupMocks({ encryptionConfigLoaded: false });
      const { container } = renderCard();
      expect(container.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('-')).not.toBeInTheDocument();
      expect(screen.queryByText('Enabled')).not.toBeInTheDocument();
      expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
    });
  });
});
