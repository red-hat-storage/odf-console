import { BackendType, ReplicationType } from '@odf/mco/constants';
import { ManagedClusterInfoType, MirrorPeerKind } from '@odf/mco/types';
import { k8sCreate, k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { createPolicyPromises } from './k8s-utils';
import { drPolicyInitialState, DRPolicyState } from './reducer';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  k8sGet: jest.fn(),
  k8sCreate: jest.fn(),
  k8sUpdate: jest.fn(),
  k8sDelete: jest.fn(),
}));

const mockK8sGet = k8sGet as jest.Mock;
const mockK8sCreate = k8sCreate as jest.Mock;

const notFound = { response: { status: 404 } };
const forbidden = { response: { status: 403 } };

const managedCluster = (
  name: string,
  storageClusterName: string
): ManagedClusterInfoType => ({
  metadata: { name },
  id: name,
  isManagedClusterAvailable: true,
  odfInfo: {
    storageClusterInfo: {
      storageClusterNamespacedName: `${storageClusterName}/openshift-storage`,
      cephFSID: `fsid-${name}`,
      deploymentType: 'internal',
    },
    odfVersion: '4.20.0',
    isValidODFVersion: true,
    storageClusterCount: 1,
  },
});

const state: DRPolicyState = {
  ...drPolicyInitialState,
  policyName: 'policy-1',
  replicationType: ReplicationType.ASYNC,
  replicationBackend: BackendType.DataFoundation,
  selectedClusters: [
    managedCluster('east-1', 'ocs-storagecluster'),
    managedCluster('west-1', 'ocs-storagecluster'),
  ],
};

const existingMirrorPeer = {
  apiVersion: 'multicluster.odf.openshift.io/v1alpha1',
  kind: 'MirrorPeer',
  metadata: { name: 'mirrorpeer-existing' },
  spec: {
    items: [
      {
        clusterName: 'east-1',
        storageClusterRef: {
          name: 'ocs-storagecluster',
          namespace: 'openshift-storage',
        },
      },
      {
        clusterName: 'west-1',
        storageClusterRef: {
          name: 'ocs-storagecluster',
          namespace: 'openshift-storage',
        },
      },
    ],
  },
} as MirrorPeerKind;

describe('createPolicyPromises DRPolicy create vs update detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockK8sCreate.mockImplementation(({ data }) => Promise.resolve(data));
  });

  it('reports a newly created DRPolicy when none exists yet', async () => {
    mockK8sGet.mockRejectedValue(notFound);

    const result = await createPolicyPromises(state, [existingMirrorPeer]);

    expect(result.isNewPolicy).toBe(true);
    expect(result.isNewMirrorPeer).toBe(false);
    expect(result.mirrorPeerName).toBe('mirrorpeer-existing');
  });

  it('reports an updated DRPolicy when the policy already exists', async () => {
    mockK8sGet.mockResolvedValue({
      apiVersion: 'ramendr.openshift.io/v1alpha1',
      kind: 'DRPolicy',
      metadata: { name: 'policy-1', uid: 'uid-1' },
      spec: { drClusters: ['east-1', 'west-1'], schedulingInterval: '10m' },
    });

    const result = await createPolicyPromises(state, [existingMirrorPeer]);

    expect(result.isNewPolicy).toBe(false);
  });

  it('treats an inconclusive lookup as pre-existing so Cancel cannot delete it', async () => {
    // First call is the existence check, the rest belong to createOrUpdate.
    mockK8sGet.mockRejectedValueOnce(forbidden).mockRejectedValue(notFound);

    const result = await createPolicyPromises(state, [existingMirrorPeer]);

    expect(result.isNewPolicy).toBe(false);
  });

  it('reports a newly created MirrorPeer when no matching peer exists', async () => {
    mockK8sGet.mockRejectedValue(notFound);
    mockK8sCreate.mockImplementation(({ model, data }) =>
      Promise.resolve(
        model.kind === 'MirrorPeer'
          ? { ...data, metadata: { name: 'mirrorpeer-new' } }
          : data
      )
    );

    const result = await createPolicyPromises(state, []);

    expect(result.isNewMirrorPeer).toBe(true);
    expect(result.mirrorPeerName).toBe('mirrorpeer-new');
    expect(result.isNewPolicy).toBe(true);
  });
});
