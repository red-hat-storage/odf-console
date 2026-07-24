import { BackendType, MAX_ALLOWED_CLUSTERS } from '@odf/mco/constants';
import { S3Details } from '../add-s3-bucket-details/s3-bucket-details-form';
import { DRPolicyState } from './reducer';
import {
  isValidBucketName,
  isValidEndpoint,
  isValidS3ProfileName,
} from './s3-validators';

export const isFilled = (v: string) => !!v && v.trim().length > 0;

const areS3DetailsFormatValid = (d: S3Details): boolean =>
  isValidBucketName(d.bucketName) &&
  isValidEndpoint(d.endpoint) &&
  isFilled(d.accessKeyId) &&
  isFilled(d.secretKey) &&
  isFilled(d.region) &&
  isFilled(d.s3ProfileName) &&
  isValidS3ProfileName(d.s3ProfileName);

export const validateClustersStepInputs = (state: DRPolicyState): boolean =>
  state.isClusterSelectionValid &&
  state.selectedClusters.length === MAX_ALLOWED_CLUSTERS;

// DF path only: run ACM Submariner / Globalnet pre-pair watches.
export const shouldRunPrePairValidation = (
  selectedClusterCount: number,
  isClusterSelectionValid: boolean,
  isDataFoundationBackend: boolean
): boolean =>
  selectedClusterCount === MAX_ALLOWED_CLUSTERS &&
  isClusterSelectionValid &&
  isDataFoundationBackend;

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
  if (state.replicationBackend !== BackendType.ThirdParty) {
    return true;
  }
  if (allDRClustersExist) {
    return true;
  }

  const { cluster1S3Details, cluster2S3Details, useSameS3Connection } = state;
  const c2ProfileValid =
    isFilled(cluster2S3Details.s3ProfileName) &&
    isValidS3ProfileName(cluster2S3Details.s3ProfileName);

  return (
    areS3DetailsFormatValid(cluster1S3Details) &&
    c2ProfileValid &&
    (useSameS3Connection || areS3DetailsFormatValid(cluster2S3Details))
  );
};
