import { BackendType, ReplicationType } from '@odf/mco/constants';
import { ManagedClusterInfoType, MirrorPeerKind } from '@odf/mco/types';
import {
  k8sCreate,
  k8sDelete,
  k8sGet,
  k8sUpdate,
} from '@openshift-console/dynamic-plugin-sdk';
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
const mockK8sUpdate = k8sUpdate as jest.Mock;
const mockK8sDelete = k8sDelete as jest.Mock;

const notFound = { response: { status: 404 } };
const forbidden = { response: { status: 403 } };
const conflict = { response: { status: 409 } };

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
  clusters: {
    ...drPolicyInitialState.clusters,
    selectedClusters: [
      managedCluster('east-1', 'ocs-storagecluster'),
      managedCluster('west-1', 'ocs-storagecluster'),
    ],
  },
  configure: {
    ...drPolicyInitialState.configure,
    replicationBackend: BackendType.DataFoundation,
  },
  policy: {
    ...drPolicyInitialState.policy,
    policyName: 'policy-1',
    replicationType: ReplicationType.ASYNC,
  },
};

const peerItem = (clusterName: string) => ({
  clusterName,
  storageClusterRef: {
    name: 'ocs-storagecluster',
    namespace: 'openshift-storage',
  },
});

const existingMirrorPeer = {
  metadata: { name: 'mirrorpeer-existing' },
  spec: { items: [peerItem('east-1'), peerItem('west-1')] },
} as MirrorPeerKind;

const existingPolicy = {
  metadata: { name: 'policy-1', uid: 'uid-1', resourceVersion: '1' },
  spec: { drClusters: ['east-1', 'west-1'], schedulingInterval: '10m' },
};

const resolveCreate = ({ model, data }) =>
  Promise.resolve(
    model.kind === 'MirrorPeer'
      ? { ...data, metadata: { name: 'mirrorpeer-new' } }
      : data
  );

describe('createPolicyPromises DRPolicy create vs update detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockK8sCreate.mockImplementation(({ data }) => Promise.resolve(data));
    mockK8sUpdate.mockImplementation(({ data }) => Promise.resolve(data));
    mockK8sDelete.mockResolvedValue({});
  });

  it('sets isNewPolicy from createOrUpdate create vs update', async () => {
    mockK8sGet.mockRejectedValueOnce(notFound);
    await expect(
      createPolicyPromises(state, [existingMirrorPeer])
    ).resolves.toMatchObject({
      isNewPolicy: true,
      isNewMirrorPeer: false,
      mirrorPeerName: 'mirrorpeer-existing',
    });
    expect(mockK8sUpdate).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockK8sUpdate.mockImplementation(({ data }) => Promise.resolve(data));
    mockK8sGet.mockResolvedValue(existingPolicy);
    await expect(
      createPolicyPromises(state, [existingMirrorPeer])
    ).resolves.toMatchObject({ isNewPolicy: false });
    expect(mockK8sCreate).not.toHaveBeenCalled();
  });

  it('fails closed on forbidden GET; 404→409 race becomes an update', async () => {
    mockK8sGet.mockRejectedValue(forbidden);
    await expect(
      createPolicyPromises(state, [existingMirrorPeer])
    ).rejects.toEqual(forbidden);

    mockK8sGet
      .mockRejectedValueOnce(notFound)
      .mockResolvedValue(existingPolicy);
    mockK8sCreate.mockRejectedValueOnce(conflict);
    await expect(
      createPolicyPromises(state, [existingMirrorPeer])
    ).resolves.toMatchObject({ isNewPolicy: false });
  });

  it('creates MirrorPeer when missing and rolls it back if DRPolicy create fails', async () => {
    mockK8sGet.mockRejectedValue(notFound);
    mockK8sCreate.mockImplementation(resolveCreate);
    await expect(createPolicyPromises(state, [])).resolves.toMatchObject({
      isNewMirrorPeer: true,
      mirrorPeerName: 'mirrorpeer-new',
      isNewPolicy: true,
    });

    mockK8sGet.mockRejectedValue(forbidden);
    mockK8sCreate.mockImplementation(resolveCreate);
    await expect(createPolicyPromises(state, [])).rejects.toEqual(forbidden);
    expect(mockK8sDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: expect.objectContaining({
          metadata: expect.objectContaining({ name: 'mirrorpeer-new' }),
        }),
      })
    );
  });

  it('does not match MirrorPeer with same SC name but different namespace', async () => {
    mockK8sGet.mockRejectedValue(notFound);
    mockK8sCreate.mockImplementation(resolveCreate);
    const staleMirrorPeer = {
      metadata: { name: 'mirrorpeer-stale' },
      spec: {
        items: [
          {
            clusterName: 'east-1',
            storageClusterRef: {
              name: 'ocs-storagecluster',
              namespace: 'other-storage',
            },
          },
          {
            clusterName: 'west-1',
            storageClusterRef: {
              name: 'ocs-storagecluster',
              namespace: 'other-storage',
            },
          },
        ],
      },
    } as MirrorPeerKind;

    await expect(
      createPolicyPromises(state, [staleMirrorPeer])
    ).resolves.toMatchObject({
      isNewMirrorPeer: true,
      mirrorPeerName: 'mirrorpeer-new',
    });
  });
});
