import { SecretKind } from '@odf/shared/types';
import { TFunction } from 'i18next';
import {
  VaultConfig,
  HpcsConfig,
  ThalesConfig,
  ProviderNames,
  KmsImplementations,
  KMSConfig,
  KMSConfigMap,
  ThalesConfigMap,
  AzureConfig,
} from '../types';

export const KMSMaxFileUploadSize = 4000000;
export const KMSConfigMapName = 'ocs-kms-connection-details';
export const KMSConfigMapCSIName = 'csi-kms-connection-details';
export const KMSVaultTokenSecretName = 'ocs-kms-token';
export const KMSVaultCSISecretName = 'ceph-csi-kms-token';
export const KMS_PROVIDER = 'KMS_PROVIDER';

type SupportedProvidersProps = {
  [key: string]: {
    group: string;
    supported: KmsImplementations[];
    allowedPlatforms?: string[];
    filter?: (kms: KMSConfigMap, secretsList: SecretKind[]) => boolean;
  };
};

/**
 * Ceph-Csi supports multiple KMS implementations ('vaulttenantsa', 'aws-metadata' etc),
 * all of them are not supported by UI. "supported" will have a list of all the UI supported
 * implementations for a particular KMS provider (AWS, Vault, IBM etc).
 */
export const SupportedProviders: SupportedProvidersProps = {
  [ProviderNames.VAULT]: {
    group: 'Vault',
    supported: [
      KmsImplementations.VAULT_TOKENS,
      KmsImplementations.VAULT_TENANT_SA,
    ],
  },
  [ProviderNames.HPCS]: {
    group: 'Hyper Protect Crypto Services',
    supported: [KmsImplementations.IBM_KEY_PROTECT],
    allowedPlatforms: ['IBMCloud'],
  },
  [ProviderNames.THALES]: {
    group: 'Thales CipherTrust Manager (using KMIP)',
    supported: [KmsImplementations.KMIP],
    filter: (kms: ThalesConfigMap, secretsList: SecretKind[]) => {
      const kmsSecret = secretsList?.find(
        (secret: SecretKind) =>
          secret?.metadata?.name === kms?.['KMIP_SECRET_NAME']
      );
      // if "UNIQUE_IDENTIFIER" is empty, means we need to filter this out
      // "UNIQUE_IDENTIFIER" is required for ceph-csi, not required for rook/noobaa
      return !kmsSecret?.data?.['UNIQUE_IDENTIFIER'];
    },
  },
  [ProviderNames.AZURE]: {
    group: 'Azure Key Vault',
    supported: [KmsImplementations.AZURE],
    allowedPlatforms: ['Azure'],
  },
};

export const DescriptionKey = {
  [KmsImplementations.VAULT_TOKENS]: 'VAULT_ADDR',
  [KmsImplementations.VAULT_TENANT_SA]: 'VAULT_ADDR',
  [KmsImplementations.IBM_KEY_PROTECT]: 'IBM_KP_SERVICE_INSTANCE_ID',
  [KmsImplementations.KMIP]: 'KMIP_ENDPOINT',
  [KmsImplementations.AZURE]: 'AZURE_VAULT_URI',
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

const AzureEmptyState: AzureConfig = Object.seal({
  name: {
    value: '',
    valid: true,
  },
  azureVaultURL: {
    value: '',
    valid: true,
  },
  clientID: {
    value: '',
    valid: true,
  },
  tenantID: {
    value: '',
    valid: true,
  },
  clientCert: {
    value: '',
    fileName: '',
    error: '',
  },
  hasHandled: true,
});

export const ProviderStateMap = {
  [ProviderNames.VAULT]: VaultEmptyState,
  [ProviderNames.HPCS]: HpcsEmptyState,
  [ProviderNames.THALES]: ThalesEmptyState,
  [ProviderNames.AZURE]: AzureEmptyState,
};

export const KMSEmptyState: KMSConfig = Object.seal({
  providerState: ProviderStateMap[ProviderNames.VAULT],
  provider: ProviderNames.VAULT,
});

export const validateConnectionName = (name: string, t: TFunction) =>
  name === ''
    ? t('This is a required field')
    : t(
        'Invalid name. Name must only include alphanumeric characters, "-", "_" or "."'
      );
