import {
  BackendType,
  MAX_ALLOWED_CLUSTERS,
  ReplicationType,
  SubmarinerStatus,
} from '@odf/mco/constants';
import { S3Details } from '@odf/mco/types';
import { DRPolicyState, drPolicyInitialState } from './reducer';
import {
  isPrePairValidationPassed,
  requiresSubmarinerAcknowledgement,
  shouldRunPrePairValidation,
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

const cluster = (name: string) =>
  ({ metadata: { name } }) as DRPolicyState['selectedClusters'][number];

const withClusters = (
  overrides: Partial<DRPolicyState> = {}
): DRPolicyState => ({
  ...drPolicyInitialState,
  isClusterSelectionValid: true,
  selectedClusters: Array.from({ length: MAX_ALLOWED_CLUSTERS }, (_, i) =>
    cluster(`cluster-${i + 1}`)
  ),
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
  it('skips S3 checks when both DRClusters already exist', () => {
    expect(
      validateThirdPartyConfigureInputs(
        withClusters({ replicationBackend: BackendType.ThirdParty }),
        true
      )
    ).toBe(true);
  });

  it('requires complete S3 details when DRClusters are missing', () => {
    const incomplete = withClusters({
      replicationBackend: BackendType.ThirdParty,
      cluster1S3Details: validS3({ bucketName: '' }),
    });
    expect(validateThirdPartyConfigureInputs(incomplete)).toBe(false);
  });

  it('allows shared S3 connection with only a unique site-2 profile name', () => {
    const shared = withClusters({
      replicationBackend: BackendType.ThirdParty,
      cluster1S3Details: validS3(),
      cluster2S3Details: validS3({
        bucketName: '',
        s3ProfileName: 'profile-2',
      }),
      useSameS3Connection: true,
    });
    expect(validateThirdPartyConfigureInputs(shared)).toBe(true);
  });

  it('rejects shared S3 connection when profile names are the same', () => {
    const sharedSameNames = withClusters({
      replicationBackend: BackendType.ThirdParty,
      cluster1S3Details: validS3({ s3ProfileName: 'shared-profile' }),
      cluster2S3Details: validS3({
        bucketName: '',
        s3ProfileName: 'shared-profile',
      }),
      useSameS3Connection: true,
    });
    expect(validateThirdPartyConfigureInputs(sharedSameNames)).toBe(false);
  });
});

describe('isPrePairValidationPassed', () => {
  it('requires an acknowledgement when neither cluster has the ACM add-on', () => {
    const notInstalled = {
      canProceed: true,
      status: SubmarinerStatus.NotInstalled,
    };
    expect(isPrePairValidationPassed(notInstalled, false)).toBe(false);
    expect(isPrePairValidationPassed(notInstalled, true)).toBe(true);
  });

  it('requires an acknowledgement when the Submariner status is Unknown', () => {
    const unknown = {
      canProceed: true,
      status: SubmarinerStatus.Unknown,
    };
    expect(isPrePairValidationPassed(unknown, false)).toBe(false);
    expect(isPrePairValidationPassed(unknown, true)).toBe(true);
  });

  it('keeps Progressing blocked even when acknowledged', () => {
    expect(
      isPrePairValidationPassed(
        { canProceed: false, status: SubmarinerStatus.Progressing },
        true
      )
    ).toBe(false);
  });

  it('passes a healthy pair without an acknowledgement', () => {
    expect(
      isPrePairValidationPassed(
        { canProceed: true, status: SubmarinerStatus.Healthy },
        false
      )
    ).toBe(true);
  });

  it('keeps hard failures blocked even when acknowledged', () => {
    expect(
      isPrePairValidationPassed(
        { canProceed: false, status: SubmarinerStatus.Inconsistent },
        true
      )
    ).toBe(false);
    expect(
      isPrePairValidationPassed(
        { canProceed: false, status: SubmarinerStatus.Degraded },
        true
      )
    ).toBe(false);
  });
});

describe('requiresSubmarinerAcknowledgement', () => {
  it.each([[SubmarinerStatus.NotInstalled], [SubmarinerStatus.Unknown]])(
    'asks the user to acknowledge %s',
    (status) => {
      expect(requiresSubmarinerAcknowledgement(status)).toBe(true);
    }
  );

  it.each([
    [SubmarinerStatus.Healthy],
    [SubmarinerStatus.Progressing],
    [SubmarinerStatus.Degraded],
    [SubmarinerStatus.Inconsistent],
    [SubmarinerStatus.GatewayNodesUnlabeled],
  ])('does not offer an acknowledgement for %s', (status) => {
    expect(requiresSubmarinerAcknowledgement(status)).toBe(false);
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
    expect(validateConfigureStepInputs(emptyS3, true, true)).toBe(true);

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
    expect(
      validatePolicyStepInputs(
        withClusters({
          policyName: '',
          replicationType: ReplicationType.ASYNC,
        })
      )
    ).toBe(false);
    expect(
      validatePolicyStepInputs(
        withClusters({
          policyName: 'policy',
          replicationType: ReplicationType.ASYNC,
        })
      )
    ).toBe(true);
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

  it('skips Third Party S3 gates when both DRClusters already exist', () => {
    const emptyS3 = withClusters({
      policyName: 'policy',
      replicationType: ReplicationType.ASYNC,
      replicationBackend: BackendType.ThirdParty,
    });
    expect(validateReviewStepInputs(emptyS3, false, true)).toBe(false);
    expect(validateReviewStepInputs(emptyS3, true, true)).toBe(true);
  });
});

describe('shouldRunPrePairValidation', () => {
  it('runs only for Data Foundation with a valid two-cluster selection', () => {
    expect(
      shouldRunPrePairValidation(
        withClusters({ replicationBackend: BackendType.DataFoundation })
      )
    ).toBe(true);
    expect(
      shouldRunPrePairValidation(
        withClusters({ replicationBackend: BackendType.ThirdParty })
      )
    ).toBe(false);
    expect(
      shouldRunPrePairValidation(
        withClusters({
          replicationBackend: BackendType.DataFoundation,
          isClusterSelectionValid: false,
        })
      )
    ).toBe(false);
    expect(
      shouldRunPrePairValidation({
        ...drPolicyInitialState,
        replicationBackend: BackendType.DataFoundation,
        isClusterSelectionValid: true,
        selectedClusters: [cluster('one')],
      })
    ).toBe(false);
  });
});
