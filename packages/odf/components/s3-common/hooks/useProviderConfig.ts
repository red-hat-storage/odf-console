import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { IAM_PROVIDER_REGISTRY } from '../registry/iam-providers';
import { S3_PROVIDER_REGISTRY, ProviderConfig } from '../registry/s3-providers';
import { ClientType } from '../types';
import { useHubS3Endpoints, HubS3EndpointsData } from './useHubS3Endpoints';
import { useSystemInfo, SystemInfoData } from './useSystemInfo';

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
    data: hubS3Endpoints,
    isLoaded: hubS3EndpointsLoaded,
    hubS3EndpointsError,
  } = useHubS3Endpoints();

  const isLoading = systemLoading || !hubS3EndpointsLoaded;
  const error = systemInfoError || hubS3EndpointsError;

  return React.useMemo(() => {
    const registryEntry =
      type === ClientType.IAM
        ? IAM_PROVIDER_REGISTRY
        : S3_PROVIDER_REGISTRY[providerType];

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
          systemInfo ?? ({} as SystemInfoData),
          odfNamespace,
          hubS3Endpoints ?? ({} as HubS3EndpointsData)
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
    hubS3Endpoints,
    isLoading,
    error,
  ]);
};
