import { S3ProviderType } from '@odf/core/types';
import { useParams } from 'react-router-dom-v5-compat';

export const useProviderType = (override?: S3ProviderType): S3ProviderType => {
  const { s3Provider } = useParams();

  if (override) return override;

  const allTypes = Object.values(S3ProviderType) as string[];
  return allTypes.includes(s3Provider)
    ? (s3Provider as S3ProviderType)
    : S3ProviderType.Noobaa;
};
