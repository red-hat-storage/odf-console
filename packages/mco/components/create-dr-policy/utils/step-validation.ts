import {
  CreateDRPolicyWizardSteps,
  MAX_ALLOWED_CLUSTERS,
} from '@odf/mco/constants';
import type { S3Details } from '@odf/mco/types';
import {
  getDescriptorById,
  type StorageVendorDescriptor,
} from '@odf/mco/utils/storage-vendor-registry';
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
  if (descriptor.id === 'data-foundation') {
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

export const validatePolicyStepInputs = (
  state: DRPolicyState,
  descriptor?: StorageVendorDescriptor
): boolean => {
  if (
    descriptor &&
    !descriptor.steps.includes(CreateDRPolicyWizardSteps.Policy)
  ) {
    return true;
  }
  return isFilled(state.policy.policyName) && !!state.policy.replicationType;
};

export const validateReviewStepInputs = (
  state: DRPolicyState,
  clustersWithS3Configuration: Set<string> = new Set(),
  prePairValidationPassed = true,
  descriptor?: StorageVendorDescriptor
): boolean =>
  validatePolicyStepInputs(state, descriptor) &&
  validateClustersStepInputs(state) &&
  validateConfigureStepInputs(
    state,
    clustersWithS3Configuration,
    prePairValidationPassed
  );
