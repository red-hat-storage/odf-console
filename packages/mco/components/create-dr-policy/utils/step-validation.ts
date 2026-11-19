import { MAX_ALLOWED_CLUSTERS, S3Mode } from '@odf/mco/constants';
import type { S3Details } from '@odf/mco/types';
import { getDescriptorById } from '@odf/mco/utils/storage-vendor-registry';
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

export const validateProviderStepInputs = (state: DRPolicyState): boolean =>
  !!state.provider.storageVendor;

export const shouldRunPrePairValidation = (state: DRPolicyState): boolean =>
  validateClustersStepInputs(state) &&
  validateProviderStepInputs(state) &&
  getDescriptorById(state.provider.storageVendor).prePairChecks.length > 0;

export const validateConfigureStepInputs = (
  state: DRPolicyState,
  clustersWithS3Configuration: Set<string>,
  prePairValidationPassed: boolean
): boolean => {
  if (!validateProviderStepInputs(state)) {
    return false;
  }
  const descriptor = getDescriptorById(state.provider.storageVendor);
  // Internal S3 needs no input; external needs bucket details per cluster.
  const s3InputsValid =
    descriptor.s3 === S3Mode.Internal ||
    validateThirdPartyConfigureInputs(state, clustersWithS3Configuration);
  return (
    validateClustersStepInputs(state) &&
    prePairValidationPassed &&
    s3InputsValid
  );
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

  // A cluster with an S3Configuration needs no input; its fields are read-only.
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
