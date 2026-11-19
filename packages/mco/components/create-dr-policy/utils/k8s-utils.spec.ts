import {
  ReplicationType,
  S3ConfigurationPhase,
  StorageVendorId,
} from '@odf/mco/constants';
import {
  DRClusterKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
  S3ConfigurationKind,
} from '@odf/mco/types';
import {
  k8sCreate,
  k8sDelete,
  k8sGet,
  k8sUpdate,
} from '@openshift-console/dynamic-plugin-sdk';
import { createPolicyPromises } from './k8s-utils';
import { drPolicyInitialState, DRPolicyState } from './reducer';

// The Console initialises i18next at runtime, so stub `t` to keep the error text.
jest.mock('i18next', () => ({
  ...jest.requireActual('i18next'),
  t: (key: string, options?: Record<string, string>) =>
    key.replace(/{{(\w+)}}/g, (_match, name) => options?.[name] ?? ''),
}));

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
  provider: {
    storageVendor: StorageVendorId.DataFoundation,
  },
  configure: {
    ...drPolicyInitialState.configure,
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

const s3Configuration = (
  name: string,
  managedClusters: string[]
): S3ConfigurationKind =>
  ({
    metadata: { name },
    spec: {
      internalS3: {
        providerCluster: managedClusters[0],
        storageClassName: 'openshift-storage.noobaa.io',
        namespace: 'openshift-storage',
      },
      managedClusters,
    },
    status: { phase: 'Ready' },
  }) as S3ConfigurationKind;

// One S3Configuration per cluster (Async), so policy tests don't also create S3.
const existingS3Configurations = [
  s3Configuration('s3-east-1', ['east-1']),
  s3Configuration('s3-west-1', ['west-1']),
];

const thirdPartyState: DRPolicyState = {
  ...state,
  provider: { storageVendor: StorageVendorId.Generic },
  configure: {
    ...state.configure,
    cluster1S3Details: {
      clusterName: 'east-1',
      bucketName: 'bucket-east',
      endpoint: 'https://s3.east.example.com',
      accessKeyId: 'key-east',
      secretKey: 'secret-east',
      region: 'east',
    },
    cluster2S3Details: {
      clusterName: 'west-1',
      bucketName: 'bucket-west',
      endpoint: 'https://s3.west.example.com',
      accessKeyId: 'key-west',
      secretKey: 'secret-west',
      region: 'west',
    },
  },
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
      createPolicyPromises(
        state,
        [existingMirrorPeer],
        existingS3Configurations
      )
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
      createPolicyPromises(
        state,
        [existingMirrorPeer],
        existingS3Configurations
      )
    ).resolves.toMatchObject({ isNewPolicy: false });
    expect(mockK8sCreate).not.toHaveBeenCalled();
  });

  it('fails closed on forbidden GET; 404→409 race becomes an update', async () => {
    mockK8sGet.mockRejectedValue(forbidden);
    await expect(
      createPolicyPromises(
        state,
        [existingMirrorPeer],
        existingS3Configurations
      )
    ).rejects.toEqual(forbidden);

    mockK8sGet
      .mockRejectedValueOnce(notFound)
      .mockResolvedValue(existingPolicy);
    mockK8sCreate.mockRejectedValueOnce(conflict);
    await expect(
      createPolicyPromises(
        state,
        [existingMirrorPeer],
        existingS3Configurations
      )
    ).resolves.toMatchObject({ isNewPolicy: false });
  });

  it('creates MirrorPeer when missing and rolls it back if DRPolicy create fails', async () => {
    mockK8sGet.mockRejectedValue(notFound);
    mockK8sCreate.mockImplementation(resolveCreate);
    await expect(
      createPolicyPromises(state, [], existingS3Configurations)
    ).resolves.toMatchObject({
      isNewMirrorPeer: true,
      mirrorPeerName: 'mirrorpeer-new',
      isNewPolicy: true,
    });

    mockK8sGet.mockRejectedValue(forbidden);
    mockK8sCreate.mockImplementation(resolveCreate);
    await expect(
      createPolicyPromises(state, [], existingS3Configurations)
    ).rejects.toEqual(forbidden);
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
      createPolicyPromises(state, [staleMirrorPeer], existingS3Configurations)
    ).resolves.toMatchObject({
      isNewMirrorPeer: true,
      mirrorPeerName: 'mirrorpeer-new',
    });
  });
});

const s3ConfigurationCreates = () =>
  mockK8sCreate.mock.calls
    .map(([arg]) => arg)
    .filter(({ model }) => model.kind === 'S3Configuration')
    .map(({ data }) => data);

const secretCreates = () =>
  mockK8sCreate.mock.calls
    .map(([arg]) => arg)
    .filter(({ model }) => model.kind === 'Secret')
    .map(({ data }) => data);

describe('createPolicyPromises S3Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockK8sGet.mockRejectedValue(notFound);
    mockK8sCreate.mockImplementation(resolveCreate);
    mockK8sUpdate.mockImplementation(({ data }) => Promise.resolve(data));
    mockK8sDelete.mockResolvedValue({});
  });

  it('creates one internal S3Configuration per cluster for Async', async () => {
    await createPolicyPromises(state, [existingMirrorPeer], []);

    expect(s3ConfigurationCreates()).toEqual([
      {
        apiVersion: 'multicluster.odf.openshift.io/v1alpha1',
        kind: 'S3Configuration',
        metadata: { name: 's3-east-1' },
        spec: {
          internalS3: {
            providerCluster: 'east-1',
            storageClassName: 'openshift-storage.noobaa.io',
            namespace: 'openshift-storage',
          },
          managedClusters: ['east-1'],
        },
      },
      expect.objectContaining({
        metadata: { name: 's3-west-1' },
        spec: expect.objectContaining({ managedClusters: ['west-1'] }),
      }),
    ]);
  });

  it('creates a single shared internal S3Configuration for Sync', async () => {
    const syncState: DRPolicyState = {
      ...state,
      policy: { ...state.policy, replicationType: ReplicationType.SYNC },
    };

    await createPolicyPromises(syncState, [existingMirrorPeer], []);

    const creates = s3ConfigurationCreates();
    expect(creates).toHaveLength(1);
    expect(creates[0]).toMatchObject({
      metadata: { name: 's3-east-1-west-1' },
      spec: {
        // The bucket is provisioned on the first cluster and shared.
        internalS3: expect.objectContaining({ providerCluster: 'east-1' }),
        managedClusters: ['east-1', 'west-1'],
      },
    });
  });

  it('reuses an S3Configuration that already covers the clusters', async () => {
    await createPolicyPromises(
      state,
      [existingMirrorPeer],
      existingS3Configurations
    );

    expect(s3ConfigurationCreates()).toEqual([]);
  });

  it('waits on a reused S3Configuration that is not Ready yet', async () => {
    const result = await createPolicyPromises(state, [existingMirrorPeer], [
      { ...existingS3Configurations[0], status: { phase: 'Configuring' } },
      existingS3Configurations[1],
    ] as S3ConfigurationKind[]);

    expect(s3ConfigurationCreates()).toEqual([]);
    expect(result.s3ConfigurationNames).toEqual(['s3-east-1']);
  });

  it('fails when a cluster is claimed by a different S3Configuration', async () => {
    await expect(
      createPolicyPromises(
        state,
        [existingMirrorPeer],
        [s3Configuration('s3-other', ['east-1', 'south-1'])]
      )
    ).rejects.toThrow(/already used by the S3 configuration s3-other/);
  });

  // Regression: ODF reports a local StorageClient on most clusters, so clientInfo must not block.
  it('creates S3Configurations for internal ODF that reports a local client', async () => {
    const withLocalClient: DRPolicyState = {
      ...state,
      clusters: {
        ...state.clusters,
        selectedClusters: state.clusters.selectedClusters.map((cluster) => ({
          ...cluster,
          odfInfo: {
            ...cluster.odfInfo,
            storageClusterInfo: {
              ...cluster.odfInfo.storageClusterInfo,
              clientInfo: { name: 'ocs-storagecluster', clusterId: cluster.id },
            },
          },
        })),
      },
    };

    await createPolicyPromises(withLocalClient, [existingMirrorPeer], []);

    expect(s3ConfigurationCreates()).toHaveLength(2);
    expect(s3ConfigurationCreates()[0]).toMatchObject({
      spec: {
        internalS3: expect.objectContaining({
          providerCluster: 'east-1',
          namespace: 'openshift-storage',
        }),
      },
    });
  });

  it('creates a secret and an external S3Configuration per cluster for third-party', async () => {
    await createPolicyPromises(thirdPartyState, [], []);

    expect(s3ConfigurationCreates()).toEqual([
      expect.objectContaining({
        metadata: { name: 's3-east-1' },
        spec: {
          externalS3: {
            secretRef: {
              name: 's3-east-1-credentials',
              namespace: 'openshift-operators',
            },
          },
          managedClusters: ['east-1'],
        },
      }),
      expect.objectContaining({
        metadata: { name: 's3-west-1' },
        spec: expect.objectContaining({ managedClusters: ['west-1'] }),
      }),
    ]);

    // MCO validates all five keys before it will configure anything.
    const [secret] = secretCreates();
    expect(secret.metadata).toEqual({
      name: 's3-east-1-credentials',
      namespace: 'openshift-operators',
    });
    expect(Object.keys(secret.data).sort()).toEqual([
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      's3Bucket',
      's3CompatibleEndpoint',
      's3Region',
    ]);

    // No MirrorPeer on the third-party path.
    expect(
      mockK8sCreate.mock.calls.some(
        ([{ model }]) => model.kind === 'MirrorPeer'
      )
    ).toBe(false);
  });

  it('refuses to reuse a Failed S3Configuration instead of reporting success', async () => {
    const failed = {
      ...s3Configuration('s3-east-1', ['east-1']),
      status: { phase: S3ConfigurationPhase.Failed, message: 'bucket gone.' },
    } as S3ConfigurationKind;

    await expect(
      createPolicyPromises(
        state,
        [existingMirrorPeer],
        [failed, s3Configuration('s3-west-1', ['west-1'])]
      )
    ).rejects.toThrow(
      /s3-east-1 for east-1 has failed .* Last reported message: bucket gone\./
    );
    expect(s3ConfigurationCreates()).toEqual([]);
    expect(
      mockK8sCreate.mock.calls.some(([{ model }]) => model.kind === 'DRPolicy')
    ).toBe(false);
  });

  // s3ProfileName is immutable, so a legacy DRCluster keeps its profile name.
  it('adopts the s3ProfileName of an existing third-party DRCluster', async () => {
    const legacyDRClusters = [
      { metadata: { name: 'east-1' }, spec: { s3ProfileName: 'legacy-east' } },
    ] as DRClusterKind[];

    await createPolicyPromises(thirdPartyState, [], [], legacyDRClusters);

    expect(s3ConfigurationCreates().map((c) => c.metadata.name)).toEqual([
      'legacy-east',
      's3-west-1',
    ]);
    expect(secretCreates().map((c) => c.metadata.name)).toEqual([
      'legacy-east-credentials',
      's3-west-1-credentials',
    ]);
  });

  it('fails when a legacy profile name is already an S3Configuration for another cluster', async () => {
    const legacyDRClusters = [
      { metadata: { name: 'east-1' }, spec: { s3ProfileName: 'shared' } },
    ] as DRClusterKind[];
    const takenName = {
      ...s3Configuration('shared', ['south-1']),
    } as S3ConfigurationKind;

    await expect(
      createPolicyPromises(thirdPartyState, [], [takenName], legacyDRClusters)
    ).rejects.toThrow(/which the S3 configuration for south-1 already uses/);
    expect(s3ConfigurationCreates()).toEqual([]);
  });

  it('rolls back and fails when a legacy profile name is not a valid name', async () => {
    const legacyDRClusters = [
      { metadata: { name: 'west-1' }, spec: { s3ProfileName: 'West_Profile' } },
    ] as DRClusterKind[];

    await expect(
      createPolicyPromises(thirdPartyState, [], [], legacyDRClusters)
    ).rejects.toThrow(/uses the S3 profile West_Profile/);
    // east-1 was created first; the rollback must remove it again.
    expect(mockK8sDelete).toHaveBeenCalledWith(
      expect.objectContaining({ resource: { metadata: { name: 's3-east-1' } } })
    );
    expect(
      mockK8sCreate.mock.calls.some(([{ model }]) => model.kind === 'DRPolicy')
    ).toBe(false);
  });

  it('rolls back created S3Configurations when the policy fails', async () => {
    mockK8sCreate.mockImplementation(({ model, data }) =>
      model.kind === 'DRPolicy'
        ? Promise.reject(forbidden)
        : resolveCreate({ model, data })
    );

    await expect(
      createPolicyPromises(state, [existingMirrorPeer], [])
    ).rejects.toEqual(forbidden);

    const deletedNames = mockK8sDelete.mock.calls
      .map(([{ resource }]) => resource?.metadata?.name)
      .filter(Boolean);
    expect(deletedNames).toEqual(
      expect.arrayContaining(['s3-east-1', 's3-west-1'])
    );
  });
});

describe('createPolicyPromises IBM Storage Scale', () => {
  const scaleCluster = (name: string): ManagedClusterInfoType => ({
    metadata: { name },
    id: name,
    isManagedClusterAvailable: true,
    storageProviders: {
      scale: { version: '5.2', clusterName: `scale-${name}` },
    },
  });

  const scaleState: DRPolicyState = {
    ...thirdPartyState,
    clusters: {
      ...thirdPartyState.clusters,
      selectedClusters: [scaleCluster('east-1'), scaleCluster('west-1')],
    },
    provider: { storageVendor: StorageVendorId.IbmStorageScale },
    policy: {
      ...thirdPartyState.policy,
      policyName: 'ibm-storage-scale-east-1-west-1',
      replicationType: ReplicationType.SYNC,
    },
  };

  const createdOfKind = (kind: string) =>
    mockK8sCreate.mock.calls
      .filter(([{ model }]) => model.kind === kind)
      .map(([{ data }]) => data);

  beforeEach(() => {
    jest.clearAllMocks();
    mockK8sGet.mockRejectedValue(notFound);
    mockK8sCreate.mockImplementation(resolveCreate);
    mockK8sDelete.mockResolvedValue({});
  });

  it('uses external S3 and pairs on the Scale cluster names', async () => {
    const result = await createPolicyPromises(scaleState, [], []);

    // External S3 from the form, not the ODF internal path.
    expect(
      createdOfKind('S3Configuration').map((config) => config.spec)
    ).toEqual([
      expect.objectContaining({
        externalS3: expect.anything(),
        managedClusters: ['east-1'],
      }),
      expect.objectContaining({
        externalS3: expect.anything(),
        managedClusters: ['west-1'],
      }),
    ]);

    const [mirrorPeer] = createdOfKind('MirrorPeer');
    expect(mirrorPeer.spec).toEqual({
      storageVendor: 'ibmstoragescale',
      type: ReplicationType.SYNC,
      items: [
        { clusterName: 'east-1', storageClusterRef: { name: 'scale-east-1' } },
        { clusterName: 'west-1', storageClusterRef: { name: 'scale-west-1' } },
      ],
    });

    const [policy] = createdOfKind('DRPolicy');
    expect(policy.metadata.name).toBe('ibm-storage-scale-east-1-west-1');
    expect(policy.spec.schedulingInterval).toBe('0m');
    expect(result.mirrorPeerName).toBe('mirrorpeer-new');
  });

  it('fails before pairing when a cluster has no Scale cluster name', async () => {
    const missingName: DRPolicyState = {
      ...scaleState,
      clusters: {
        ...scaleState.clusters,
        selectedClusters: [
          scaleCluster('east-1'),
          { ...scaleCluster('west-1'), storageProviders: {} },
        ],
      },
    };

    await expect(createPolicyPromises(missingName, [], [])).rejects.toThrow(
      /IBM Storage Scale cluster name for cluster west-1/
    );
    expect(createdOfKind('MirrorPeer')).toEqual([]);
    // The S3 created first is rolled back.
    expect(mockK8sDelete).toHaveBeenCalledWith(
      expect.objectContaining({ resource: { metadata: { name: 's3-east-1' } } })
    );
  });
});
