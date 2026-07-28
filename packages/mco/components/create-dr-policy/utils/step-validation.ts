import { BackendType, MAX_ALLOWED_CLUSTERS } from '@odf/mco/constants';
import { DRPolicyState, S3Details } from './reducer';
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

// Configure-step gate only (pair already required to reach this step).
export const validateConfigureStepInputs = (
  state: DRPolicyState,
  allDRClustersExist: boolean,
  prePairValidationPassed: boolean
): boolean => {
  if (state.replicationBackend === BackendType.DataFoundation) {
    return prePairValidationPassed;
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

  const { cluster1S3Details, cluster2S3Details, useSameS3Connection } = state;
  // Profile name alone is enough for site-2 when sharing connection; regex rejects empty.
  const c2ProfileValid = isValidS3ProfileName(cluster2S3Details.s3ProfileName);

  return (
    areS3DetailsFormatValid(cluster1S3Details) &&
    c2ProfileValid &&
    (useSameS3Connection || areS3DetailsFormatValid(cluster2S3Details))
  );
};

export const validatePolicyStepInputs = (state: DRPolicyState): boolean =>
  isFilled(state.policyName) && !!state.replicationType;

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
