import {
  BackendType,
  MAX_ALLOWED_CLUSTERS,
  ReplicationType,
} from '@odf/mco/constants';
import { DRPolicyState, S3Details, drPolicyInitialState } from './reducer';
import {
  validateClustersStepInputs,
  validateConfigureStepInputs,
  validatePolicyStepInputs,
  validateReviewStepInputs,
  validateThirdPartyConfigureInputs,
} from './step-validation';

const validS3 = (overrides: Partial<S3Details> = {}): S3Details => ({
  clusterName: 'cluster-1',
  bucketName: 'my-bucket',
  endpoint: 'https://s3.example.com',
  accessKeyId: 'AKIAEXAMPLE',
  secretKey: 'secret',
  region: 'us-east-1',
  s3ProfileName: 'profile-1',
  ...overrides,
});

const withClusters = (
  overrides: Partial<DRPolicyState> = {}
): DRPolicyState => ({
  ...drPolicyInitialState,
  isClusterSelectionValid: true,
  selectedClusters: new Array(MAX_ALLOWED_CLUSTERS).fill({
    metadata: { name: 'cluster' },
  }),
  ...overrides,
});

describe('validateClustersStepInputs', () => {
  it('requires a valid pair selection', () => {
    expect(validateClustersStepInputs(drPolicyInitialState)).toBe(false);
    expect(validateClustersStepInputs(withClusters())).toBe(true);
    expect(
      validateClustersStepInputs(
        withClusters({ isClusterSelectionValid: false })
      )
    ).toBe(false);
  });
});

describe('validateThirdPartyConfigureInputs', () => {
  it('skips S3 when both DRClusters already exist', () => {
    expect(
      validateThirdPartyConfigureInputs(
        withClusters({
          replicationBackend: BackendType.ThirdParty,
        }),
        true
      )
    ).toBe(true);
  });

  it('requires full S3 details for both sites unless shared', () => {
    const incomplete = withClusters({
      replicationBackend: BackendType.ThirdParty,
      cluster1S3Details: validS3(),
      cluster2S3Details: validS3({
        bucketName: '',
        s3ProfileName: 'profile-2',
      }),
      useSameS3Connection: false,
    });
    expect(validateThirdPartyConfigureInputs(incomplete)).toBe(false);

    const shared = withClusters({
      replicationBackend: BackendType.ThirdParty,
      cluster1S3Details: validS3(),
      cluster2S3Details: validS3({
        bucketName: '',
        endpoint: '',
        accessKeyId: '',
        secretKey: '',
        region: '',
        s3ProfileName: 'profile-2',
      }),
      useSameS3Connection: true,
    });
    expect(validateThirdPartyConfigureInputs(shared)).toBe(true);
  });
});

describe('validateConfigureStepInputs', () => {
  it('gates Data Foundation on Submariner pre-pair only', () => {
    const state = withClusters({
      replicationBackend: BackendType.DataFoundation,
    });
    expect(validateConfigureStepInputs(state, false, false)).toBe(false);
    expect(validateConfigureStepInputs(state, false, true)).toBe(true);
  });

  it('gates Third Party on S3 configure inputs', () => {
    const emptyS3 = withClusters({
      replicationBackend: BackendType.ThirdParty,
    });
    expect(validateConfigureStepInputs(emptyS3, false, true)).toBe(false);

    const filled = withClusters({
      replicationBackend: BackendType.ThirdParty,
      cluster1S3Details: validS3(),
      cluster2S3Details: validS3({ s3ProfileName: 'profile-2' }),
      useSameS3Connection: false,
    });
    expect(validateConfigureStepInputs(filled, false, true)).toBe(true);
  });
});

describe('validatePolicyStepInputs', () => {
  it('requires policy name and replication type', () => {
    expect(validatePolicyStepInputs(drPolicyInitialState)).toBe(false);
    expect(
      validatePolicyStepInputs(
        withClusters({ policyName: 'policy', replicationType: null })
      )
    ).toBe(false);
  });
});

describe('validateReviewStepInputs', () => {
  it('requires policy, clusters, and configure gates', () => {
    const ready = withClusters({
      policyName: 'policy',
      replicationType: ReplicationType.ASYNC,
      replicationBackend: BackendType.DataFoundation,
    });
    expect(validateReviewStepInputs(ready, false, false)).toBe(false);
    expect(validateReviewStepInputs(ready, false, true)).toBe(true);
  });
});
