import {
  S3_INTERNAL_ENDPOINT_PREFIX,
  S3_INTERNAL_ENDPOINT_SUFFIX,
  S3_LOCAL_ENDPOINT,
} from '@odf/shared/s3';
import {
  NOOBAA_ADMIN_SECRET,
  NOOBAA_ACCESS_KEY_ID,
  NOOBAA_SECRET_ACCESS_KEY,
  RGW_ADMIN_SECRET,
  RGW_ACCESS_KEY_ID,
  RGW_SECRET_ACCESS_KEY,
} from '../../../../constants';
import { S3ProviderType } from '../types';

export type ProviderRegistryEntry = {
  adminSecretName: (odfNamespace: string) => string;
  secretFieldKeys: { accessKey: string; secretKey: string };
  endpointBuilder?: (odfNamespace: string) => URL;
  region: string;
};

export const PROVIDER_REGISTRY: Record<S3ProviderType, ProviderRegistryEntry> =
  {
    [S3ProviderType.NooBaa]: {
      adminSecretName: () => NOOBAA_ADMIN_SECRET,
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
    },
    [S3ProviderType.RGW]: {
      adminSecretName: () => RGW_ADMIN_SECRET,
      secretFieldKeys: {
        accessKey: RGW_ACCESS_KEY_ID,
        secretKey: RGW_SECRET_ACCESS_KEY,
      },
      // ToDo: Placeholder, fix this
      endpointBuilder: (odfNamespace: string) =>
        new URL(
          window.location.hostname.includes('localhost')
            ? S3_LOCAL_ENDPOINT
            : `${S3_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${S3_INTERNAL_ENDPOINT_SUFFIX}`
        ),
      // "region" is a required parameter for the SDK, using "us-east-1" as a workaround ("none" is not supported)
      region: 'us-east-1',
    },
  };
