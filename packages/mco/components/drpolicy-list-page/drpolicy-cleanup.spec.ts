import { DRPolicyKind } from '@odf/mco/types';
import { k8sDelete, k8sListItems } from '@openshift-console/dynamic-plugin-sdk';
import { createPolicyCleanup } from './drpolicy-list-page';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  ...jest.requireActual('@openshift-console/dynamic-plugin-sdk'),
  k8sListItems: jest.fn(),
  k8sDelete: jest.fn(),
}));

const mockList = k8sListItems as jest.Mock;
const mockDelete = k8sDelete as jest.Mock;

const policy = (name: string, drClusters: string[]) =>
  ({ metadata: { name }, spec: { drClusters } }) as DRPolicyKind;
const deleted = policy('policy-1', ['east-1', 'west-1']);

const s3Configuration = {
  metadata: { name: 's3-east-1' },
  spec: {
    managedClusters: ['east-1'],
    externalS3: {
      secretRef: {
        name: 's3-east-1-credentials',
        namespace: 'openshift-operators',
      },
    },
  },
};
const mirrorPeer = {
  metadata: { name: 'mirrorpeer-1' },
  spec: { items: [{ clusterName: 'east-1' }, { clusterName: 'west-1' }] },
};

const listing = (
  drPolicies: DRPolicyKind[],
  s3Configurations = [s3Configuration]
) =>
  mockList.mockImplementation(({ model }) =>
    Promise.resolve(
      {
        DRPolicy: drPolicies,
        S3Configuration: s3Configurations,
        MirrorPeer: [mirrorPeer],
      }[model.kind]
    )
  );

const deletedNames = () =>
  mockDelete.mock.calls.map(
    ([{ model, resource }]) => `${model.kind}/${resource.metadata.name}`
  );

describe('createPolicyCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue({});
  });

  it('deletes what no remaining policy uses', async () => {
    // The deleted policy can still be listed while its finalizer runs.
    listing([deleted]);

    await createPolicyCleanup()(deleted);

    expect(deletedNames()).toEqual([
      'S3Configuration/s3-east-1',
      'Secret/s3-east-1-credentials',
      'MirrorPeer/mirrorpeer-1',
    ]);
  });

  it('keeps what another policy still uses', async () => {
    listing([deleted, policy('policy-2', ['east-1', 'west-1'])]);

    await createPolicyCleanup()(deleted);

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes a pending secret on retry after its S3Configuration is gone', async () => {
    const cleanup = createPolicyCleanup();
    listing([deleted]);
    mockDelete.mockImplementation(({ model }) =>
      model.kind === 'Secret'
        ? Promise.reject(new Error('secret delete failed'))
        : Promise.resolve({})
    );
    await expect(cleanup(deleted)).rejects.toBeDefined();

    listing([], []);
    mockDelete.mockClear().mockResolvedValue({});
    await cleanup(deleted);

    expect(deletedNames()).toEqual([
      'Secret/s3-east-1-credentials',
      'MirrorPeer/mirrorpeer-1',
    ]);
  });

  it('fails instead of skipping cleanup when a list fails', async () => {
    const forbidden = { response: { status: 403 } };
    mockList.mockRejectedValue(forbidden);

    await expect(createPolicyCleanup()(deleted)).rejects.toBe(forbidden);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
