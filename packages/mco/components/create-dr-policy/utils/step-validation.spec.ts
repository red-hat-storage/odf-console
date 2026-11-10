import {
  BackendType,
  MAX_ALLOWED_CLUSTERS,
  ReplicationType,
  SubmarinerStatus,
} from '@odf/mco/constants';
import { S3Details } from '@odf/mco/types';
import { DRPolicyState, drPolicyInitialState, emptyS3Details } from './reducer';
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
          configure: { replicationBackend: BackendType.ThirdParty },
        }),
        bothCovered
      )
    ).toBe(true);
  });

  // A covered cluster's fields are read-only and empty, so requiring them would
  // block Next forever when only one cluster is already configured.
  it('only requires details for clusters without an S3Configuration', () => {
    const oneCovered = withClusters({
      configure: {
        replicationBackend: BackendType.ThirdParty,
        cluster1S3Details: emptyS3Details,
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
      configure: {
        replicationBackend: BackendType.ThirdParty,
        cluster1S3Details: validS3({ bucketName: '' }),
      },
    });
    expect(validateThirdPartyConfigureInputs(incomplete)).toBe(false);
  });

  // With a shared connection the form copies site 1's details onto site 2, so
  // site 2 is validated on its own (now synced) values.
  it('accepts a shared S3 connection once the details are synced', () => {
    const shared = withClusters({
      configure: {
        replicationBackend: BackendType.ThirdParty,
        cluster1S3Details: validS3(),
        cluster2S3Details: validS3({ clusterName: 'cluster-2' }),
        useSameS3Connection: true,
      },
    });
    expect(validateThirdPartyConfigureInputs(shared)).toBe(true);
  });

  it('requires complete site-2 details when the connection is not shared', () => {
    const notShared = withClusters({
      configure: {
        replicationBackend: BackendType.ThirdParty,
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
  it('asks only for NotInstalled and Unknown', () => {
    expect(
      requiresSubmarinerAcknowledgement(SubmarinerStatus.NotInstalled)
    ).toBe(true);
    expect(requiresSubmarinerAcknowledgement(SubmarinerStatus.Unknown)).toBe(
      true
    );
    expect(requiresSubmarinerAcknowledgement(SubmarinerStatus.Healthy)).toBe(
      false
    );
    expect(
      requiresSubmarinerAcknowledgement(SubmarinerStatus.Progressing)
    ).toBe(false);
    expect(
      requiresSubmarinerAcknowledgement(SubmarinerStatus.Inconsistent)
    ).toBe(false);
  });
});

describe('validateConfigureStepInputs', () => {
  it('gates Data Foundation on Submariner pre-pair only', () => {
    const state = withClusters({
      configure: { replicationBackend: BackendType.DataFoundation },
    });
    expect(validateConfigureStepInputs(state, false, false)).toBe(false);
    expect(validateConfigureStepInputs(state, false, true)).toBe(true);
  });

  it('gates Third Party on S3 configure inputs', () => {
    const emptyS3 = withClusters({
      configure: { replicationBackend: BackendType.ThirdParty },
    });
    expect(validateConfigureStepInputs(emptyS3, new Set(), true)).toBe(false);
    expect(validateConfigureStepInputs(emptyS3, bothCovered, true)).toBe(true);

    const filled = withClusters({
      configure: {
        replicationBackend: BackendType.ThirdParty,
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
      configure: { replicationBackend: BackendType.ThirdParty },
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
          configure: { replicationBackend: BackendType.DataFoundation },
        })
      )
    ).toBe(true);
    expect(
      shouldRunPrePairValidation(
        withClusters({
          configure: { replicationBackend: BackendType.ThirdParty },
        })
      )
    ).toBe(false);
    expect(
      shouldRunPrePairValidation(
        withClusters({
          configure: { replicationBackend: BackendType.DataFoundation },
          clusters: { isClusterSelectionValid: false },
        })
      )
    ).toBe(false);
    expect(
      shouldRunPrePairValidation({
        ...drPolicyInitialState,
        configure: {
          ...drPolicyInitialState.configure,
          replicationBackend: BackendType.DataFoundation,
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
