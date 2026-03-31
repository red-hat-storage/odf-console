import {
  ODF_IAM_PROXY_PATH,
  IAM_INTERNAL_ENDPOINT_PREFIX,
  IAM_INTERNAL_ENDPOINT_SUFFIX,
  IAM_LOCAL_ENDPOINT,
} from '@odf/shared/iam';
import { NOOBAA_STATIC_CONFIG, ProviderRegistryEntry } from './s3-providers';

// IAM provider registry is based on Noobaa S3 provider, but with IAM-specific endpoint and proxy path
export const IAM_PROVIDER_REGISTRY: ProviderRegistryEntry = {
  staticConfig: {
    ...NOOBAA_STATIC_CONFIG,
    // Override s3EndpointBuilder and s3ConsolePath to use IAM details
    s3EndpointBuilder: (odfNamespace: string) =>
      new URL(
        window.location.hostname.includes('localhost')
          ? IAM_LOCAL_ENDPOINT
          : `${IAM_INTERNAL_ENDPOINT_PREFIX}${odfNamespace}${IAM_INTERNAL_ENDPOINT_SUFFIX}`
      ),
    s3ConsolePath: ODF_IAM_PROXY_PATH,
  },
};
