import { S3ProviderType } from '@odf/core/types';
import {
  NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_PREFIX,
  NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_SUFFIX,
  ODF_S3_VECTORS_PROXY_PATH,
  S3_VECTORS_LOCAL_ENDPOINT,
} from '@odf/shared/s3-vectors';
import { S3_PROVIDER_REGISTRY, ProviderRegistryEntry } from './s3-providers';

// S3 Vectors provider registry is based on Noobaa S3 provider, but with s3-vectors-specific endpoint and proxy path
export const S3_VECTORS_PROVIDER_REGISTRY: ProviderRegistryEntry = {
  staticConfig: {
    ...S3_PROVIDER_REGISTRY[S3ProviderType.Noobaa].staticConfig!,
    // Override s3EndpointBuilder and s3ConsolePath to use S3 Vectors details
    s3EndpointBuilder: (odfNamespace: string) =>
      new URL(
        window.location.hostname.includes('localhost')
          ? S3_VECTORS_LOCAL_ENDPOINT
          : `${NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${NOOBAA_S3_VECTORS_INTERNAL_ENDPOINT_SUFFIX}`
      ),
    s3ConsolePath: ODF_S3_VECTORS_PROXY_PATH,
  },
};
