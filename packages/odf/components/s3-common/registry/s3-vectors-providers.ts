import {
  NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_PREFIX,
  NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_SUFFIX,
  NOOBAA_S3_VECTORS_PROXY_PATH,
  S3_VECTORS_LOCAL_ENDPOINT,
} from '@odf/shared/s3-vectors';
import { NOOBAA_STATIC_CONFIG, ProviderRegistryEntry } from './s3-providers';

// S3 Vectors provider registry is based on Noobaa S3 provider, but with s3-vectors-specific endpoint and proxy path
export const S3_VECTORS_PROVIDER_REGISTRY: ProviderRegistryEntry = {
  staticConfig: {
    ...NOOBAA_STATIC_CONFIG,
    // Override s3EndpointBuilder and s3ConsolePath to use S3 Vectors details
    s3EndpointBuilder: (odfNamespace: string) =>
      new URL(
        window.location.hostname.includes('localhost')
          ? S3_VECTORS_LOCAL_ENDPOINT
          : `${NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_SUFFIX}`
      ),
    s3ConsolePath: NOOBAA_S3_VECTORS_PROXY_PATH,
  },
};
