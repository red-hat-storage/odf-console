import { ODF_ADMIN } from '@odf/core/features';
import { ODF_PROXY_ROOT_PATH } from '@odf/shared/constants';
import { NooBaaObjectBucketModel } from '@odf/shared/models';
import { K8sResourceKind } from '@odf/shared/types';
import {
  referenceForModel,
  getValidWatchK8sResourceObj,
  swrFetcher,
  isClientPlugin,
} from '@odf/shared/utils';
import {
  useK8sWatchResource,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
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
  foldersPath: string | null
): UseBucketOriginResult => {
  const isAdmin = useFlag(ODF_ADMIN);
  const isClientCluster = isClientPlugin();

  const isAdminOrClientCluster = isAdmin || isClientCluster;

  // Admin (Provider) flow & Client cluster flow:
  // Use K8s watch resource to fetch CRs
  const [objectBuckets, objectBucketsLoaded, objectBucketsError] =
    useK8sWatchResource<K8sResourceKind[]>(
      getValidWatchK8sResourceObj(
        {
          kind: referenceForModel(NooBaaObjectBucketModel),
          namespaced: false,
          isList: true,
        },
        // Only watch when admin or client cluster, and not in folder view
        isAdminOrClientCluster && !foldersPath
      )
    );

  // Non-admin (Provider) flow: Use SWR to fetch from proxy endpoint
  // Key will be "null", preventing SWR from making requests
  const swrKey = !isAdminOrClientCluster
    ? `${ODF_PROXY_ROOT_PATH}/provider-proxy/info/bucket/${encodeURIComponent(bucketName)}`
    : null;

  const {
    data: bucketOriginData,
    error: swrError,
    isLoading: swrLoading,
  } = useSWR<BucketResponse>(swrKey, swrFetcher);

  if (isAdminOrClientCluster) {
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
