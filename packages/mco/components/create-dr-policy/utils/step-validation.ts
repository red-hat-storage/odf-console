import {
  BackendType,
  MAX_ALLOWED_CLUSTERS,
  SubmarinerStatus,
} from '@odf/mco/constants';
import type { S3Details } from '@odf/mco/types';
import { getName } from '@odf/shared/selectors';
import type { DRPolicyState } from './reducer';
import { isValidBucketName, isValidEndpoint } from './s3-validators';

const isFilled = (v: string) => !!v && v.trim().length > 0;

const areS3DetailsFormatValid = (d: S3Details): boolean =>
  isValidBucketName(d.bucketName) &&
  isValidEndpoint(d.endpoint) &&
  isFilled(d.accessKeyId) &&
  isFilled(d.secretKey) &&
  isFilled(d.region);

export const validateClustersStepInputs = (state: DRPolicyState): boolean =>
  state.clusters.isClusterSelectionValid &&
  state.clusters.selectedClusters.length === MAX_ALLOWED_CLUSTERS;

export const shouldRunPrePairValidation = (state: DRPolicyState): boolean =>
  validateClustersStepInputs(state) &&
  state.configure.replicationBackend === BackendType.DataFoundation;

type PrePairValidationSummary = {
  canProceed: boolean;
  status: SubmarinerStatus;
};

export const requiresSubmarinerAcknowledgement = (
  status: SubmarinerStatus
): boolean =>
  status === SubmarinerStatus.NotInstalled ||
  status === SubmarinerStatus.Unknown;

export const isPrePairValidationPassed = (
  { canProceed, status }: PrePairValidationSummary,
  acknowledgedUnvalidatedSubmariner: boolean
): boolean =>
  canProceed &&
  (!requiresSubmarinerAcknowledgement(status) ||
    acknowledgedUnvalidatedSubmariner);

export const validateConfigureStepInputs = (
  state: DRPolicyState,
  clustersWithS3Configuration: Set<string>,
  prePairValidationPassed: boolean
): boolean => {
  if (state.configure.replicationBackend === BackendType.DataFoundation) {
    return validateClustersStepInputs(state) && prePairValidationPassed;
  }
  return validateThirdPartyConfigureInputs(state, clustersWithS3Configuration);
};

export const validateThirdPartyConfigureInputs = (
  state: DRPolicyState,
  clustersWithS3Configuration: Set<string> = new Set()
): boolean => {
  const { cluster1S3Details, cluster2S3Details } = state.configure;
  const detailsByCluster: Record<string, S3Details> = {
    [cluster1S3Details.clusterName]: cluster1S3Details,
    [cluster2S3Details.clusterName]: cluster2S3Details,
  };

  // A cluster already backed by an S3Configuration needs no input: its spec is
  // immutable and its fields are shown read-only.
  return state.clusters.selectedClusters.every((cluster) => {
    const clusterName = getName(cluster);
    if (clustersWithS3Configuration.has(clusterName)) {
      return true;
    }
    const details = detailsByCluster[clusterName];
    return !!details && areS3DetailsFormatValid(details);
  });
};

export const validatePolicyStepInputs = (state: DRPolicyState): boolean =>
  isFilled(state.policy.policyName) && !!state.policy.replicationType;

export const validateReviewStepInputs = (
  state: DRPolicyState,
  clustersWithS3Configuration: Set<string> = new Set(),
  prePairValidationPassed = true
): boolean =>
  validatePolicyStepInputs(state) &&
  validateClustersStepInputs(state) &&
  validateConfigureStepInputs(
    state,
    clustersWithS3Configuration,
    prePairValidationPassed
  );
