import { S3ProviderType } from '@odf/core/types';
import {
  NOOBAA_S3_INTERNAL_ENDPOINT_PREFIX,
  NOOBAA_S3_INTERNAL_ENDPOINT_SUFFIX,
  S3_LOCAL_ENDPOINT,
  NOOBAA_S3_PROXY_PATH,
  RGW_INTERNAL_S3_PROXY_PATH,
  RGW_S3_INTERNAL_ENDPOINT_SUFFIX,
  getClientNoobaaS3ProxyPath,
} from '@odf/shared/s3';
import {
  NOOBAA_ADMIN_SECRET,
  NOOBAA_ACCESS_KEY_ID,
  NOOBAA_SECRET_ACCESS_KEY,
  getNoobaaCOSUAdminSecret,
  RGW_ACCESS_KEY_ID,
  RGW_SECRET_ACCESS_KEY,
} from '../../../constants';
import { StorageClientInfoData } from '../hooks/useStorageClientInfo';
import { SystemInfoData } from '../hooks/useSystemInfo';

const getRGWEndpointURL = (endpoint: string | undefined): URL | undefined => {
  if (!endpoint) {
    return undefined;
  }

  try {
    const url = new URL(endpoint);
    const hostname = url.hostname;

    // Check if hostname already ends with ".cluster.local"
    if (hostname.endsWith(RGW_S3_INTERNAL_ENDPOINT_SUFFIX)) {
      return url;
    }

    // Add ".cluster.local" before the port (if any)
    const newHostname = `${hostname}${RGW_S3_INTERNAL_ENDPOINT_SUFFIX}`;
    url.hostname = newHostname;

    return url;
  } catch {
    return undefined;
  }
};

export type ProviderConfig = {
  adminSecretName: string;
  adminSecretNamespace?: string;
  secretFieldKeys: {
    accessKey: string;
    secretKey: string;
    fallBackAccessKey?: string;
    fallBackSecretKey?: string;
  };
  region: string;
  s3Endpoint?: URL;
  s3EndpointBuilder?: (odfNamespace: string) => URL;
  s3ConsolePath?: string;
  skipSignatureCalculation: boolean;
  excludePortInSignature?: boolean;
  dataPathSeparation?: {
    s3Endpoint?: URL;
    s3EndpointBuilder?: (odfNamespace: string) => URL;
    s3ConsolePath?: string;
    skipSignatureCalculation: boolean;
    excludePortInSignature?: boolean;
  };
};

export type ProviderRegistryEntry = {
  staticConfig?: ProviderConfig;
  dynamicConfig?: {
    getConfig: (
      systemInfo: SystemInfoData,
      odfNamespace: string,
      storageClientInfo?: StorageClientInfoData
    ) => ProviderConfig;
  };
};

export const NOOBAA_STATIC_CONFIG: ProviderConfig = {
  adminSecretName: NOOBAA_ADMIN_SECRET,
  secretFieldKeys: {
    accessKey: NOOBAA_ACCESS_KEY_ID,
    secretKey: NOOBAA_SECRET_ACCESS_KEY,
  },
  // "region" is a required parameter for the SDK, using "none" as a workaround
  region: 'none',
  s3EndpointBuilder: (odfNamespace: string) =>
    new URL(
      window.location.hostname.includes('localhost')
        ? S3_LOCAL_ENDPOINT
        : `${NOOBAA_S3_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${NOOBAA_S3_INTERNAL_ENDPOINT_SUFFIX}`
    ),
  s3ConsolePath: NOOBAA_S3_PROXY_PATH,
  skipSignatureCalculation: false,
};

export const S3_PROVIDER_REGISTRY: Record<
  S3ProviderType,
  ProviderRegistryEntry
> = {
  [S3ProviderType.Noobaa]: {
    dynamicConfig: {
      getConfig: (
        _systemInfo,
        odfNamespace,
        storageClientInfo
      ): ProviderConfig => {
        const config: ProviderConfig = { ...NOOBAA_STATIC_CONFIG };
        delete config.s3EndpointBuilder;
        config.s3Endpoint = new URL(
          window.location.hostname.includes('localhost')
            ? S3_LOCAL_ENDPOINT
            : `${NOOBAA_S3_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${NOOBAA_S3_INTERNAL_ENDPOINT_SUFFIX}`
        );

        // when skipSignatureCalculation is true, "s3Endpoint" should be direct S3 endpoint URL (eg: Route)
        // when false it can be either service host or direct S3 endpoint URL (only for signing),
        // but request is still redirected to "s3ConsolePath" (proxy) via middleware
        if (
          storageClientInfo?.isClientCluster &&
          !!storageClientInfo?.noobaaS3Endpoint
        ) {
          config.s3Endpoint = new URL(storageClientInfo.noobaaS3Endpoint);
          config.s3ConsolePath = getClientNoobaaS3ProxyPath(
            storageClientInfo.clientUID
          );
          config.skipSignatureCalculation = false;
          config.excludePortInSignature = true;

          const dataPathEndpointUrl = new URL(
            storageClientInfo.noobaaS3Endpoint
          );
          dataPathEndpointUrl.protocol = window.location.hostname.includes(
            'localhost'
          )
            ? 'http:'
            : 'https:';
          config.dataPathSeparation = {
            s3Endpoint: dataPathEndpointUrl,
            skipSignatureCalculation: true,
          };
        }

        return config;
      },
    },
  },
  [S3ProviderType.RgwInt]: {
    dynamicConfig: {
      getConfig: (systemInfo): ProviderConfig => {
        const [intRgwNs, intRgwInfo] =
          Object.entries(systemInfo ?? {}).find(
            ([_ns, info]) => info.isInternalMode === true
          ) || [];
        return {
          adminSecretName: getNoobaaCOSUAdminSecret(intRgwInfo?.ocsClusterName),
          adminSecretNamespace: intRgwNs,
          secretFieldKeys: {
            accessKey: RGW_ACCESS_KEY_ID,
            secretKey: RGW_SECRET_ACCESS_KEY,
            fallBackAccessKey: NOOBAA_ACCESS_KEY_ID,
            fallBackSecretKey: NOOBAA_SECRET_ACCESS_KEY,
          },
          // "region" is a required parameter for the SDK, using "us-east-1" as a workaround ("none" is not supported)
          region: 'us-east-1',
          s3Endpoint: window.location.hostname.includes('localhost')
            ? new URL(S3_LOCAL_ENDPOINT)
            : getRGWEndpointURL(intRgwInfo?.rgwSecureEndpoint),
          s3ConsolePath: RGW_INTERNAL_S3_PROXY_PATH,
          skipSignatureCalculation: false,
        };
      },
    },
  },
  [S3ProviderType.RgwExt]: {},
};
