import { ODF_PROXY_ROOT_PATH } from '@odf/shared/constants';
import { NooBaaObjectBucketModel } from '@odf/shared/models';
import { K8sResourceKind } from '@odf/shared/types';
import {
  referenceForModel,
  getValidWatchK8sResourceObj,
  swrFetcher,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import useSWR from 'swr';

enum CreationMethod {
  OBC = 'obc',
  S3 = 's3',
}

type BucketResponse = { createdVia: CreationMethod };

type UseBucketOriginResult = {
  isCreatedByOBC: boolean;
  noobaaObjectBucket: K8sResourceKind | null;
  isLoading: boolean;
  error: unknown;
};

export const useBucketOrigin = (
  bucketName: string,
  foldersPath: string | null,
  isAdmin: boolean
): UseBucketOriginResult => {
  // Admin flow: Use K8s watch resource (only when isAdmin is true)
  const [objectBuckets, objectBucketsLoaded, objectBucketsError] =
    useK8sWatchResource<K8sResourceKind[]>(
      getValidWatchK8sResourceObj(
        {
          kind: referenceForModel(NooBaaObjectBucketModel),
          namespaced: false,
          isList: true,
        },
        isAdmin && !foldersPath // Only watch when admin and not in folder view
      )
    );

  // Non-admin flow: Use SWR to fetch from proxy endpoint (only when isAdmin is false)
  // Key will be "null" for admin users, preventing SWR from making requests
  const swrKey = !isAdmin
    ? `${ODF_PROXY_ROOT_PATH}/provider-proxy/info/bucket/${encodeURIComponent(bucketName)}`
    : null;

  const {
    data: bucketOriginData,
    error: swrError,
    isLoading: swrLoading,
  } = useSWR<BucketResponse>(swrKey, swrFetcher);

  if (isAdmin) {
    // Use K8s watch data
    const noobaaObjectBucket: K8sResourceKind = objectBuckets?.find(
      (ob) => ob.spec?.endpoint?.bucketName === bucketName
    );

    return {
      isCreatedByOBC: !!noobaaObjectBucket,
      noobaaObjectBucket: noobaaObjectBucket || null,
      isLoading: !objectBucketsLoaded,
      error: objectBucketsError,
    };
  } else {
    // Use SWR data (proxy endpoint)
    return {
      isCreatedByOBC: bucketOriginData?.createdVia === CreationMethod.OBC,
      noobaaObjectBucket: null,
      isLoading: swrLoading,
      error: swrError,
    };
  }
};
