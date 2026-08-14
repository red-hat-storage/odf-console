import { S3Commands, STORAGE_CLASS_DEEP_ARCHIVE } from '@odf/shared/s3';
import useSWR from 'swr';

const BUCKET_HEAD_CACHE_KEY_SUFFIX = 'BUCKET_HEAD_CACHE_KEY_SUFFIX';

type UseDeepArchiveSupportResult = {
  isDeepArchiveEnabled: boolean;
  isLoading: boolean;
};

export const useDeepArchiveSupport = (
  s3Client: S3Commands,
  bucketName: string
): UseDeepArchiveSupportResult => {
  const { data: bucketInfo, isLoading } = useSWR(
    `${s3Client.providerType}-${bucketName}-${BUCKET_HEAD_CACHE_KEY_SUFFIX}`,
    () => s3Client.headBucket({ Bucket: bucketName })
  );

  const isDeepArchiveEnabled =
    bucketInfo?.supportedStorageClasses?.includes(STORAGE_CLASS_DEEP_ARCHIVE) ??
    false;

  return { isDeepArchiveEnabled, isLoading };
};
