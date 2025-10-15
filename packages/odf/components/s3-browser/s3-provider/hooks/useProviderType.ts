import { useParams } from 'react-router-dom-v5-compat';
import { S3ProviderType } from '../types';

export const useProviderType = (override?: S3ProviderType): S3ProviderType => {
  const { endpoint } = useParams();

  if (override) return override;
  return endpoint === S3ProviderType.RGW
    ? S3ProviderType.RGW
    : S3ProviderType.NooBaa;
};
