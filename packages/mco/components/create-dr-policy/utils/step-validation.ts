import {
  BackendType,
  MAX_ALLOWED_CLUSTERS,
  SubmarinerStatus,
} from '@odf/mco/constants';
import type { S3Details } from '@odf/mco/types';
import type { DRPolicyState } from './reducer';
import {
  isValidBucketName,
  isValidEndpoint,
  isValidS3ProfileName,
} from './s3-validators';

const isFilled = (v: string) => !!v && v.trim().length > 0;

const areS3DetailsFormatValid = (d: S3Details): boolean =>
  isValidBucketName(d.bucketName) &&
  isValidEndpoint(d.endpoint) &&
  isFilled(d.accessKeyId) &&
  isFilled(d.secretKey) &&
  isFilled(d.region) &&
  isValidS3ProfileName(d.s3ProfileName);

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
  allDRClustersExist: boolean,
  prePairValidationPassed: boolean
): boolean => {
  if (state.configure.replicationBackend === BackendType.DataFoundation) {
    return validateClustersStepInputs(state) && prePairValidationPassed;
  }
  return validateThirdPartyConfigureInputs(state, allDRClustersExist);
};

export const validateThirdPartyConfigureInputs = (
  state: DRPolicyState,
  allDRClustersExist = false
): boolean => {
  if (allDRClustersExist) {
    return true;
  }

  const { cluster1S3Details, cluster2S3Details, useSameS3Connection } =
    state.configure;
  const c2ProfileValid = isValidS3ProfileName(cluster2S3Details.s3ProfileName);
  const profileNamesAreUnique =
    cluster1S3Details.s3ProfileName.trim() !==
    cluster2S3Details.s3ProfileName.trim();

  return (
    areS3DetailsFormatValid(cluster1S3Details) &&
    c2ProfileValid &&
    profileNamesAreUnique &&
    (useSameS3Connection || areS3DetailsFormatValid(cluster2S3Details))
  );
};

export const validatePolicyStepInputs = (state: DRPolicyState): boolean =>
  isFilled(state.policy.policyName) && !!state.policy.replicationType;

export const validateReviewStepInputs = (
  state: DRPolicyState,
  allDRClustersExist = false,
  prePairValidationPassed = true
): boolean =>
  validatePolicyStepInputs(state) &&
  validateClustersStepInputs(state) &&
  validateConfigureStepInputs(
    state,
    allDRClustersExist,
    prePairValidationPassed
  );
