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
  state.isClusterSelectionValid &&
  state.selectedClusters.length === MAX_ALLOWED_CLUSTERS;

export const shouldRunPrePairValidation = (state: DRPolicyState): boolean =>
  validateClustersStepInputs(state) &&
  state.replicationBackend === BackendType.DataFoundation;

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
  bothDRClustersExist: boolean,
  prePairValidationPassed: boolean
): boolean => {
  if (state.replicationBackend === BackendType.DataFoundation) {
    return validateClustersStepInputs(state) && prePairValidationPassed;
  }
  return validateThirdPartyConfigureInputs(state, bothDRClustersExist);
};

export const validateThirdPartyConfigureInputs = (
  state: DRPolicyState,
  bothDRClustersExist = false
): boolean => {
  if (bothDRClustersExist) {
    return true;
  }

  const { cluster1S3Details, cluster2S3Details, useSameS3Connection } = state;
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
  isFilled(state.policyName) && !!state.replicationType;

export const validateReviewStepInputs = (
  state: DRPolicyState,
  bothDRClustersExist = false,
  prePairValidationPassed = true
): boolean =>
  validatePolicyStepInputs(state) &&
  validateClustersStepInputs(state) &&
  validateConfigureStepInputs(
    state,
    bothDRClustersExist,
    prePairValidationPassed
  );
