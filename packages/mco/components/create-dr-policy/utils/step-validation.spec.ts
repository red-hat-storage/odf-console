import {
  MAX_ALLOWED_CLUSTERS,
  ReplicationType,
  StorageVendorId,
} from '@odf/mco/constants';
import { S3Details } from '@odf/mco/types';
import { DRPolicyState, drPolicyInitialState, emptyS3Details } from './reducer';
import {
  shouldRunPrePairValidation,
  validateClustersStepInputs,
  validateConfigureStepInputs,
  validatePolicyStepInputs,
  validateReviewStepInputs,
  validateThirdPartyConfigureInputs,
} from './step-validation';

const validS3 = (overrides: Partial<S3Details> = {}): S3Details => ({
  ...emptyS3Details,
  clusterName: 'cluster-1',
  bucketName: 'my-bucket',
  endpoint: 'https://s3.example.com',
  accessKeyId: 'AKIAEXAMPLE',
  secretKey: 'secret',
  region: 'us-east-1',
  ...overrides,
});

const cluster = (name: string) =>
  ({
    metadata: { name },
  }) as DRPolicyState['clusters']['selectedClusters'][number];

type StateOverrides = {
  clusters?: Partial<DRPolicyState['clusters']>;
  provider?: Partial<DRPolicyState['provider']>;
  configure?: Partial<DRPolicyState['configure']>;
  policy?: Partial<DRPolicyState['policy']>;
};

const withClusters = (overrides: StateOverrides = {}): DRPolicyState => ({
  clusters: {
    ...drPolicyInitialState.clusters,
    isClusterSelectionValid: true,
    selectedClusters: Array.from({ length: MAX_ALLOWED_CLUSTERS }, (_, i) =>
      cluster(`cluster-${i + 1}`)
    ),
    ...overrides.clusters,
  },
  provider: {
    ...drPolicyInitialState.provider,
    ...overrides.provider,
  },
  configure: {
    ...drPolicyInitialState.configure,
    ...overrides.configure,
  },
  policy: {
    ...drPolicyInitialState.policy,
    ...overrides.policy,
  },
});

const bothCovered = new Set(['cluster-1', 'cluster-2']);

describe('validateClustersStepInputs', () => {
  it('requires a valid pair selection', () => {
    expect(validateClustersStepInputs(drPolicyInitialState)).toBe(false);
    expect(validateClustersStepInputs(withClusters())).toBe(true);
  });
});

describe('validateThirdPartyConfigureInputs', () => {
  it('skips S3 checks when both clusters already have an S3Configuration', () => {
    expect(
      validateThirdPartyConfigureInputs(
        withClusters({
          provider: { storageVendor: StorageVendorId.Generic },
        }),
        bothCovered
      )
    ).toBe(true);
  });

  // Requiring a covered cluster's read-only fields would block Next forever.
  it('only requires details for clusters without an S3Configuration', () => {
    const oneCovered = withClusters({
      provider: { storageVendor: StorageVendorId.Generic },
      configure: {
        cluster1S3Details: { ...emptyS3Details, clusterName: 'cluster-1' },
        cluster2S3Details: validS3({ clusterName: 'cluster-2' }),
      },
    });
    expect(
      validateThirdPartyConfigureInputs(oneCovered, new Set(['cluster-1']))
    ).toBe(true);
    expect(validateThirdPartyConfigureInputs(oneCovered)).toBe(false);
  });

  it('requires complete S3 details when no S3Configuration exists', () => {
    const incomplete = withClusters({
      provider: { storageVendor: StorageVendorId.Generic },
      configure: {
        cluster1S3Details: validS3({ bucketName: '' }),
        cluster2S3Details: validS3({ clusterName: 'cluster-2' }),
      },
    });
    expect(validateThirdPartyConfigureInputs(incomplete)).toBe(false);
  });

  // A shared connection copies site 1's details onto site 2.
  it('accepts a shared S3 connection once the details are synced', () => {
    const shared = withClusters({
      provider: { storageVendor: StorageVendorId.Generic },
      configure: {
        cluster1S3Details: validS3(),
        cluster2S3Details: validS3({ clusterName: 'cluster-2' }),
        useSameS3Connection: true,
      },
    });
    expect(validateThirdPartyConfigureInputs(shared)).toBe(true);
  });

  it('requires complete site-2 details when the connection is not shared', () => {
    const notShared = withClusters({
      provider: { storageVendor: StorageVendorId.Generic },
      configure: {
        cluster1S3Details: validS3(),
        cluster2S3Details: validS3({
          clusterName: 'cluster-2',
          bucketName: '',
        }),
        useSameS3Connection: false,
      },
    });
    expect(validateThirdPartyConfigureInputs(notShared)).toBe(false);
  });
});

describe('validateConfigureStepInputs', () => {
  it('gates Data Foundation on Submariner pre-pair only', () => {
    const state = withClusters({
      provider: { storageVendor: StorageVendorId.DataFoundation },
    });
    expect(validateConfigureStepInputs(state, new Set(), false)).toBe(false);
    expect(validateConfigureStepInputs(state, new Set(), true)).toBe(true);
  });

  it('gates Third Party on S3 configure inputs', () => {
    const emptyS3 = withClusters({
      provider: { storageVendor: StorageVendorId.Generic },
    });
    expect(validateConfigureStepInputs(emptyS3, new Set(), true)).toBe(false);
    expect(validateConfigureStepInputs(emptyS3, bothCovered, true)).toBe(true);

    const filled = withClusters({
      provider: { storageVendor: StorageVendorId.Generic },
      configure: {
        cluster1S3Details: validS3(),
        cluster2S3Details: validS3({ clusterName: 'cluster-2' }),
        useSameS3Connection: false,
      },
    });
    expect(validateConfigureStepInputs(filled, new Set(), true)).toBe(true);
  });
});

describe('validatePolicyStepInputs', () => {
  it('requires policy name and replication type', () => {
    expect(validatePolicyStepInputs(drPolicyInitialState)).toBe(false);
    expect(
      validatePolicyStepInputs(
        withClusters({
          policy: {
            policyName: 'policy',
            replicationType: ReplicationType.ASYNC,
          },
        })
      )
    ).toBe(true);
  });
});

describe('validateReviewStepInputs', () => {
  it('skips Third Party S3 gates when both clusters are already configured', () => {
    const emptyS3 = withClusters({
      policy: {
        policyName: 'policy',
        replicationType: ReplicationType.ASYNC,
      },
      provider: { storageVendor: StorageVendorId.Generic },
    });
    expect(validateReviewStepInputs(emptyS3, new Set(), true)).toBe(false);
    expect(validateReviewStepInputs(emptyS3, bothCovered, true)).toBe(true);
  });
});

describe('shouldRunPrePairValidation', () => {
  it('runs only for Data Foundation with a valid two-cluster selection', () => {
    expect(
      shouldRunPrePairValidation(
        withClusters({
          provider: { storageVendor: StorageVendorId.DataFoundation },
        })
      )
    ).toBe(true);
    expect(
      shouldRunPrePairValidation(
        withClusters({
          provider: { storageVendor: StorageVendorId.Generic },
        })
      )
    ).toBe(false);
    expect(
      shouldRunPrePairValidation(
        withClusters({
          provider: { storageVendor: StorageVendorId.DataFoundation },
          clusters: { isClusterSelectionValid: false },
        })
      )
    ).toBe(false);
    expect(
      shouldRunPrePairValidation({
        ...drPolicyInitialState,
        provider: {
          storageVendor: StorageVendorId.DataFoundation,
        },
        clusters: {
          ...drPolicyInitialState.clusters,
          isClusterSelectionValid: true,
          selectedClusters: [cluster('one')],
        },
      })
    ).toBe(false);
  });
});
