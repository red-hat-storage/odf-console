import {
  VaultConfig,
  HpcsConfig,
  ThalesConfig,
  ProviderNames,
  KmsImplementations,
  KMSConfig,
} from '../types';

export const KMSMaxFileUploadSize = 4000000;
export const KMSConfigMapName = 'ocs-kms-connection-details';
export const KMSConfigMapCSIName = 'csi-kms-connection-details';
export const KMSVaultTokenSecretName = 'ocs-kms-token';
export const KMSVaultCSISecretName = 'ceph-csi-kms-token';
export const KMS_PROVIDER = 'KMS_PROVIDER';

/**
 * Ceph-Csi supports multiple KMS implementations ('vaulttenantsa', 'aws-metadata' etc),
 * all of them are not supported by UI. "supported" will have a list of all the UI supported
 * implementations for a particular KMS provider (AWS, Vault, IBM etc).
 */
export const SupportedProviders = {
  [ProviderNames.VAULT]: {
    group: 'Vault',
    supported: [KmsImplementations.VAULT_TOKENS],
  },
  [ProviderNames.HPCS]: {
    group: 'Hyper Protect Crypto Services',
    supported: [KmsImplementations.IBM_KEY_PROTECT],
    allowedPlatforms: ['IBMCloud'],
  },
  [ProviderNames.THALES]: {
    group: 'Thales (using KMIP)',
    supported: [KmsImplementations.KMIP],
  },
};

export const DescriptionKey = {
  [KmsImplementations.VAULT_TOKENS]: 'VAULT_ADDR',
  [KmsImplementations.VAULT_TENANT_SA]: 'VAULT_ADDR',
  [KmsImplementations.IBM_KEY_PROTECT]: 'IBM_KP_SERVICE_INSTANCE_ID',
  [KmsImplementations.KMIP]: 'KMIP_ENDPOINT',
};

const VaultEmptyState: VaultConfig = Object.seal({
  name: {
    value: '',
    valid: true,
  },
  authValue: {
    value: '',
    valid: true,
  },
  address: {
    value: '',
    valid: true,
  },
  port: {
    value: '',
    valid: true,
  },
  authMethod: null,
  backend: '',
  caCert: null,
  tls: '',
  clientCert: null,
  clientKey: null,
  providerNamespace: '',
  providerAuthNamespace: '',
  providerAuthPath: '',
  hasHandled: true,
  caCertFile: '',
  clientCertFile: '',
  clientKeyFile: '',
});

const HpcsEmptyState: HpcsConfig = Object.seal({
  name: {
    value: '',
    valid: true,
  },
  instanceId: {
    value: '',
    valid: true,
  },
  apiKey: {
    value: '',
    valid: true,
  },
  rootKey: {
    value: '',
    valid: true,
  },
  baseUrl: {
    value: '',
    valid: true,
  },
  tokenUrl: '',
  hasHandled: true,
});

const ThalesEmptyState: ThalesConfig = Object.seal({
  name: {
    value: '',
    valid: true,
  },
  address: {
    value: '',
    valid: true,
  },
  port: {
    value: '',
    valid: true,
  },
  clientCert: {
    value: '',
    fileName: '',
    error: '',
  },
  caCert: {
    value: '',
    fileName: '',
    error: '',
  },
  clientKey: {
    value: '',
    fileName: '',
    error: '',
  },
  uniqueId: {
    value: '',
    valid: true,
  },
  tls: '',
  hasHandled: true,
});

export const ProviderStateMap = {
  [ProviderNames.VAULT]: VaultEmptyState,
  [ProviderNames.HPCS]: HpcsEmptyState,
  [ProviderNames.THALES]: ThalesEmptyState,
};

export const KMSEmptyState: KMSConfig = Object.seal({
  providerState: ProviderStateMap[ProviderNames.VAULT],
  provider: ProviderNames.VAULT,
});
