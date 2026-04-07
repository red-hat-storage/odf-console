import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { IAM_PROVIDER_REGISTRY } from '../registry/iam-providers';
import {
  S3_PROVIDER_REGISTRY,
  ProviderConfig,
  ProviderRegistryEntry,
} from '../registry/s3-providers';
import { S3_VECTORS_PROVIDER_REGISTRY } from '../registry/s3-vectors-providers';
import { ClientType } from '../types';
import { useStorageClientInfo } from './useStorageClientInfo';
import { useSystemInfo } from './useSystemInfo';

const getRegistryEntry = (
  type: ClientType,
  providerType: S3ProviderType
): ProviderRegistryEntry => {
  switch (type) {
    case ClientType.IAM:
      return IAM_PROVIDER_REGISTRY;
    case ClientType.S3_VECTOR:
      return S3_VECTORS_PROVIDER_REGISTRY;
    default:
      return S3_PROVIDER_REGISTRY[providerType];
  }
};

type UseProviderConfigResult = {
  config: ProviderConfig | null;
  isLoading: boolean;
  error: unknown;
};

export const useProviderConfig = (
  providerType: S3ProviderType,
  type: ClientType = ClientType.S3
): UseProviderConfigResult => {
  const {
    data: systemInfo,
    odfNamespace,
    isLoading: systemLoading,
    error: systemInfoError,
  } = useSystemInfo();
  const {
    data: storageClientInfo,
    isLoaded: clientsLoaded,
    clientsError,
  } = useStorageClientInfo();

  const isLoading = systemLoading || !clientsLoaded;
  const error = systemInfoError || clientsError;

  return React.useMemo(() => {
    const registryEntry = getRegistryEntry(type, providerType);

    if (registryEntry.staticConfig) {
      const staticConfig = registryEntry.staticConfig;
      const config: ProviderConfig = {
        adminSecretName: staticConfig.adminSecretName,
        adminSecretNamespace: staticConfig.adminSecretNamespace || odfNamespace,
        secretFieldKeys: staticConfig.secretFieldKeys,
        region: staticConfig.region,
        s3Endpoint: staticConfig.s3EndpointBuilder(odfNamespace),
        s3ConsolePath: staticConfig.s3ConsolePath,
        skipSignatureCalculation: staticConfig.skipSignatureCalculation,
      };

      return { config, isLoading: false, error: null };
    }

    const transformedConfig = registryEntry.dynamicConfig
      ? registryEntry.dynamicConfig.getConfig(
          systemInfo,
          odfNamespace,
          storageClientInfo
        )
      : null;

    if (!!transformedConfig && !transformedConfig.adminSecretNamespace) {
      transformedConfig.adminSecretNamespace = odfNamespace;
    }

    return {
      config: transformedConfig,
      isLoading,
      error,
    };
  }, [
    providerType,
    type,
    odfNamespace,
    systemInfo,
    storageClientInfo,
    isLoading,
    error,
  ]);
};
