import { S3ProviderType } from '@odf/core/types';
import {
  S3_INTERNAL_ENDPOINT_PREFIX,
  S3_INTERNAL_ENDPOINT_SUFFIX,
  S3_LOCAL_ENDPOINT,
} from '@odf/shared/s3';
import { getProxyPath } from '@odf/shared/s3/utils';
import {
  NOOBAA_ADMIN_SECRET,
  NOOBAA_ACCESS_KEY_ID,
  NOOBAA_SECRET_ACCESS_KEY,
  RGW_ACCESS_KEY_ID,
  RGW_SECRET_ACCESS_KEY,
} from '../../../../constants';

export type ProviderConfig = {
  adminSecretName: string;
  adminSecretNamespace?: string;
  secretFieldKeys: { accessKey: string; secretKey: string };
  endpoint?: URL;
  endpointBuilder?: (odfNamespace: string) => URL;
  region: string;
  proxyPath: string;
};

export type ProviderRegistryEntry = {
  staticConfig?: ProviderConfig;
  dynamicConfig?: {
    getConfig: (rawApiData: any) => ProviderConfig;
  };
};

export const PROVIDER_REGISTRY: Record<S3ProviderType, ProviderRegistryEntry> =
  {
    [S3ProviderType.Noobaa]: {
      staticConfig: {
        adminSecretName: NOOBAA_ADMIN_SECRET,
        secretFieldKeys: {
          accessKey: NOOBAA_ACCESS_KEY_ID,
          secretKey: NOOBAA_SECRET_ACCESS_KEY,
        },
        endpointBuilder: (odfNamespace: string) =>
          new URL(
            window.location.hostname.includes('localhost')
              ? S3_LOCAL_ENDPOINT
              : `${S3_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${S3_INTERNAL_ENDPOINT_SUFFIX}`
          ),
        // "region" is a required parameter for the SDK, using "none" as a workaround
        region: 'none',
        proxyPath: getProxyPath(),
      },
    },
    // ToDo: Placeholder, fix this
    [S3ProviderType.RgwInt]: {
      dynamicConfig: {
        getConfig: (rawApiData: any): ProviderConfig => {
          return {
            adminSecretName: rawApiData.adminSecretName,
            adminSecretNamespace: rawApiData.adminSecretNamespace,
            secretFieldKeys: {
              accessKey: RGW_ACCESS_KEY_ID,
              secretKey: RGW_SECRET_ACCESS_KEY,
            },
            endpoint: new URL(
              window.location.hostname.includes('localhost')
                ? S3_LOCAL_ENDPOINT
                : rawApiData.endpoint
            ),
            // "region" is a required parameter for the SDK, using "us-east-1" as a workaround ("none" is not supported)
            region: rawApiData.region || 'us-east-1',
            proxyPath: getProxyPath(),
          };
        },
      },
    },
    // ToDo: Placeholder, fix this
    [S3ProviderType.RgwExt]: {
      dynamicConfig: {
        getConfig: (rawApiData: any): ProviderConfig => {
          return {
            adminSecretName: rawApiData.adminSecretName,
            adminSecretNamespace: rawApiData.adminSecretNamespace,
            secretFieldKeys: {
              accessKey: RGW_ACCESS_KEY_ID,
              secretKey: RGW_SECRET_ACCESS_KEY,
            },
            endpoint: new URL(
              window.location.hostname.includes('localhost')
                ? S3_LOCAL_ENDPOINT
                : rawApiData.endpoint
            ),
            // "region" is a required parameter for the SDK, using "us-east-1" as a workaround ("none" is not supported)
            region: rawApiData.region || 'us-east-1',
            proxyPath: getProxyPath(),
          };
        },
      },
    },
  };
