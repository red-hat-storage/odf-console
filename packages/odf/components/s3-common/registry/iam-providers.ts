import { S3ProviderType } from '@odf/core/types';
import {
  ODF_IAM_PROXY_PATH,
  IAM_INTERNAL_ENDPOINT_PREFIX,
  IAM_INTERNAL_ENDPOINT_SUFFIX,
  IAM_LOCAL_ENDPOINT,
} from '@odf/shared/iam';
import { S3_PROVIDER_REGISTRY, ProviderRegistryEntry } from './s3-providers';

// IAM provider registry is based on Noobaa S3 provider, but with IAM-specific endpoint and proxy path
export const IAM_PROVIDER_REGISTRY: ProviderRegistryEntry = {
  staticConfig: {
    ...S3_PROVIDER_REGISTRY[S3ProviderType.Noobaa].staticConfig!,
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
