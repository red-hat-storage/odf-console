import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type StorageClientPhase =
  | 'Initializing'
  | 'Onboarding'
  | 'Progressing'
  | 'Connected'
  | 'Offboarding'
  | 'Failed';

interface StorageClientSpec {
  storageProviderEndpoint: string;
  onboardingTicket: string;
}

interface StorageClientStatus {
  phase?: StorageClientPhase;
  id?: string;
}

export type StorageClient = K8sResourceCommon & {
  spec?: StorageClientSpec;
  status?: StorageClientStatus;
};
