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
  getNoobaaCOSUAdminSecret,
  RGW_ACCESS_KEY_ID,
  RGW_SECRET_ACCESS_KEY,
} from '../../../../constants';
import { SystemInfoData } from '../hooks/useSystemInfo';

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
  s3ConsolePath: string;
  skipSignatureCalculation: boolean;
};

export type ProviderRegistryEntry = {
  staticConfig?: ProviderConfig;
  dynamicConfig?: {
    getConfig: (
      systemInfo: SystemInfoData,
      odfNamespace: string
    ) => ProviderConfig;
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
        // "region" is a required parameter for the SDK, using "none" as a workaround
        region: 'none',
        s3EndpointBuilder: (odfNamespace: string) =>
          new URL(
            window.location.hostname.includes('localhost')
              ? S3_LOCAL_ENDPOINT
              : `${S3_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${S3_INTERNAL_ENDPOINT_SUFFIX}`
          ),
        s3ConsolePath: getProxyPath(),
        skipSignatureCalculation: false,
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
            adminSecretName: getNoobaaCOSUAdminSecret(
              intRgwInfo?.ocsClusterName
            ),
            adminSecretNamespace: intRgwNs,
            secretFieldKeys: {
              accessKey: RGW_ACCESS_KEY_ID,
              secretKey: RGW_SECRET_ACCESS_KEY,
              fallBackAccessKey: NOOBAA_ACCESS_KEY_ID,
              fallBackSecretKey: NOOBAA_SECRET_ACCESS_KEY,
            },
            // "region" is a required parameter for the SDK, using "us-east-1" as a workaround ("none" is not supported)
            region: 'us-east-1',
            s3Endpoint: new URL(
              window.location.hostname.includes('localhost')
                ? S3_LOCAL_ENDPOINT
                : intRgwInfo?.rgwSecureEndpoint
            ),
            // ToDo: Placeholder, fix this
            s3ConsolePath: getProxyPath(),
            skipSignatureCalculation: false,
          };
        },
      },
    },
    [S3ProviderType.RgwExt]: {
      dynamicConfig: {
        getConfig: (systemInfo): ProviderConfig => {
          const [extRgwNs, extRgwInfo] =
            Object.entries(systemInfo ?? {}).find(
              ([_ns, info]) => info.isExternalMode === true
            ) || [];
          return {
            adminSecretName: getNoobaaCOSUAdminSecret(
              extRgwInfo?.ocsClusterName
            ),
            adminSecretNamespace: extRgwNs,
            secretFieldKeys: {
              accessKey: RGW_ACCESS_KEY_ID,
              secretKey: RGW_SECRET_ACCESS_KEY,
              fallBackAccessKey: NOOBAA_ACCESS_KEY_ID,
              fallBackSecretKey: NOOBAA_SECRET_ACCESS_KEY,
            },
            // "region" is a required parameter for the SDK, using "us-east-1" as a workaround ("none" is not supported)
            region: 'us-east-1',
            s3Endpoint: new URL(
              window.location.hostname.includes('localhost')
                ? S3_LOCAL_ENDPOINT
                : extRgwInfo?.rgwSecureEndpoint
            ),
            // ToDo: Placeholder, fix this
            s3ConsolePath: extRgwInfo?.rgwSecureEndpoint,
            skipSignatureCalculation: true,
          };
        },
      },
    },
  };
