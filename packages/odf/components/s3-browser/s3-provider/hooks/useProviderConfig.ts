import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { PROVIDER_REGISTRY, ProviderConfig } from '../registry/providers';
import { useSystemInfo } from './useSystemInfo';

type UseProviderConfigResult = {
  config: ProviderConfig | null;
  isLoading: boolean;
  error: unknown;
};

export const useProviderConfig = (
  providerType: S3ProviderType
): UseProviderConfigResult => {
  const { data: systemInfo, odfNamespace, isLoading, error } = useSystemInfo();

  return React.useMemo(() => {
    const registryEntry = PROVIDER_REGISTRY[providerType];

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

    const transformedConfig =
      !!systemInfo && registryEntry.dynamicConfig
        ? registryEntry.dynamicConfig.getConfig(systemInfo, odfNamespace)
        : null;

    if (!!transformedConfig && !transformedConfig.adminSecretNamespace) {
      transformedConfig.adminSecretNamespace = odfNamespace;
    }

    return {
      config: transformedConfig,
      isLoading,
      error,
    };
  }, [providerType, odfNamespace, systemInfo, isLoading, error]);
};
