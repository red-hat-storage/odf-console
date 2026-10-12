import { BackendType, ReplicationType } from '@odf/mco/constants';
import {
  DRClusterKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
} from '@odf/mco/types';
import {
  createDRCluster,
  createOrUpdateRamenS3Secret,
  deleteDRCluster,
  fetchRamenS3Profiles,
  updateRamenHubOperatorConfig,
} from '@odf/mco/utils/tps-payload-creator';
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

jest.mock('@odf/mco/utils/tps-payload-creator', () => {
  const actual = jest.requireActual('@odf/mco/utils/tps-payload-creator');
  return {
    ...actual,
    createOrUpdateRamenS3Secret: jest.fn(),
    updateRamenHubOperatorConfig: jest.fn(),
    deleteDRCluster: jest.fn(),
    createDRCluster: jest.fn(),
    fetchRamenS3Profiles: jest.fn(),
  };
});

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

  it('skips TPS helper rollback when DRPolicy create conflicts', async () => {
    const tpsState: DRPolicyState = {
      ...state,
      configure: {
        ...state.configure,
        replicationBackend: BackendType.ThirdParty,
        cluster1S3Details: {
          clusterName: 'east-1',
          bucketName: 'bucket-east',
          endpoint: 'https://s3.example',
          accessKeyId: 'ak',
          secretKey: 'sk',
          region: 'us-east-1',
          s3ProfileName: 'profile-east',
        },
        cluster2S3Details: {
          clusterName: 'west-1',
          bucketName: 'bucket-west',
          endpoint: 'https://s3.example',
          accessKeyId: 'ak',
          secretKey: 'sk',
          region: 'us-east-1',
          s3ProfileName: 'profile-west',
        },
      },
    };

    (fetchRamenS3Profiles as jest.Mock).mockResolvedValue([
      { s3ProfileName: 'profile-east' },
      { s3ProfileName: 'profile-west' },
    ]);
    (createOrUpdateRamenS3Secret as jest.Mock).mockImplementation(
      async (args) => {
        if (args.mutationDetails) {
          args.mutationDetails.isUpdated = true;
        }
        return {};
      }
    );
    (updateRamenHubOperatorConfig as jest.Mock).mockResolvedValue({});
    (createDRCluster as jest.Mock).mockImplementation(async ({ name }) => ({
      metadata: { name },
    }));
    (deleteDRCluster as jest.Mock).mockResolvedValue({});
    mockK8sCreate.mockRejectedValue(conflict);

    await expect(createPolicyPromises(tpsState, [], [])).rejects.toEqual(
      conflict
    );

    expect(updateRamenHubOperatorConfig).not.toHaveBeenCalledWith(
      expect.objectContaining({ remove: true })
    );
    expect(mockK8sDelete).not.toHaveBeenCalled();
    expect(deleteDRCluster).toHaveBeenCalled();
  });

  it('restores a replaced DRCluster after a DRPolicy create conflict', async () => {
    const tpsState: DRPolicyState = {
      ...state,
      configure: {
        ...state.configure,
        replicationBackend: BackendType.ThirdParty,
        cluster1S3Details: {
          clusterName: 'east-1',
          bucketName: 'bucket-east',
          endpoint: 'https://s3.example',
          accessKeyId: 'ak',
          secretKey: 'sk',
          region: 'us-east-1',
          s3ProfileName: 'profile-east-new',
        },
        cluster2S3Details: {
          clusterName: 'west-1',
          bucketName: 'bucket-west',
          endpoint: 'https://s3.example',
          accessKeyId: 'ak',
          secretKey: 'sk',
          region: 'us-east-1',
          s3ProfileName: 'profile-west',
        },
      },
    };
    const existingEast = {
      metadata: { name: 'east-1' },
      spec: {
        s3ProfileName: 'profile-east-old',
        cidrs: ['10.0.0.0/16', '192.168.1.0/24'],
        clusterFence: 'Fenced',
      },
    } as DRClusterKind;

    (fetchRamenS3Profiles as jest.Mock).mockResolvedValue([
      { s3ProfileName: 'profile-east-old' },
      { s3ProfileName: 'profile-west' },
    ]);
    (createOrUpdateRamenS3Secret as jest.Mock).mockImplementation(
      async (args) => {
        if (args.mutationDetails) {
          args.mutationDetails.isUpdated = true;
        }
        return {};
      }
    );
    (updateRamenHubOperatorConfig as jest.Mock).mockResolvedValue({});
    (createDRCluster as jest.Mock).mockImplementation(async ({ name }) => ({
      metadata: { name },
    }));
    (deleteDRCluster as jest.Mock).mockResolvedValue({});
    mockK8sCreate.mockRejectedValue(conflict);

    await expect(
      createPolicyPromises(tpsState, [], [existingEast])
    ).rejects.toEqual(conflict);

    expect(deleteDRCluster).toHaveBeenCalledWith('east-1');
    expect(createDRCluster).toHaveBeenCalledWith({
      name: 'east-1',
      s3ProfileName: 'profile-east-new',
    });
    expect(createDRCluster).toHaveBeenCalledWith({
      name: 'east-1',
      s3ProfileName: 'profile-east-old',
      cidrs: ['10.0.0.0/16', '192.168.1.0/24'],
      clusterFence: 'Fenced',
    });
    const createCalls = (createDRCluster as jest.Mock).mock.calls.map(
      ([args]) => args.s3ProfileName
    );
    expect(createCalls.lastIndexOf('profile-east-old')).toBeGreaterThan(
      createCalls.indexOf('profile-east-new')
    );
  });
});
