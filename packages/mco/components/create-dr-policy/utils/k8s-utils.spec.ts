import { BackendType, ReplicationType } from '@odf/mco/constants';
import { ManagedClusterInfoType, MirrorPeerKind } from '@odf/mco/types';
import {
  k8sCreate,
  k8sDelete,
  k8sUpdate,
} from '@openshift-console/dynamic-plugin-sdk';
import { createPolicyPromises } from './k8s-utils';
import { drPolicyInitialState, DRPolicyState } from './reducer';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  k8sCreate: jest.fn(),
  k8sUpdate: jest.fn(),
  k8sDelete: jest.fn(),
}));

const mockK8sCreate = k8sCreate as jest.Mock;
const mockK8sUpdate = k8sUpdate as jest.Mock;
const mockK8sDelete = k8sDelete as jest.Mock;

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

  it('creates a DRPolicy and does not update when the name already exists', async () => {
    await expect(
      createPolicyPromises(state, [existingMirrorPeer])
    ).resolves.toMatchObject({
      isNewPolicy: true,
      isNewMirrorPeer: false,
      mirrorPeerName: 'mirrorpeer-existing',
    });
    expect(mockK8sUpdate).not.toHaveBeenCalled();

    jest.clearAllMocks();
    mockK8sCreate.mockRejectedValueOnce(conflict);
    mockK8sUpdate.mockImplementation(({ data }) => Promise.resolve(data));
    await expect(
      createPolicyPromises(state, [existingMirrorPeer])
    ).rejects.toEqual(conflict);
    expect(mockK8sUpdate).not.toHaveBeenCalled();
  });

  it('creates MirrorPeer when missing and rolls it back if DRPolicy create fails', async () => {
    mockK8sCreate.mockImplementation(resolveCreate);
    await expect(createPolicyPromises(state, [])).resolves.toMatchObject({
      isNewMirrorPeer: true,
      mirrorPeerName: 'mirrorpeer-new',
      isNewPolicy: true,
    });

    mockK8sCreate.mockImplementation(({ model, data }) => {
      if (model.kind === 'DRPolicy') {
        return Promise.reject(forbidden);
      }
      return resolveCreate({ model, data });
    });
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
