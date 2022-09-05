import { ProvisionerDetails } from '@openshift-console/dynamic-plugin-sdk';

type Parameters = ProvisionerDetails['parameters'];

export const isEncryptionKMSIdVisibleOrRequired = (params: Parameters) =>
  params?.encrypted?.value === 'true';
