import { K8sResourceObj } from '@odf/core/types';
import { getValidWatchK8sResourceObj } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  K8sResourceCommon,
  WatchK8sResult,
} from '@openshift-console/dynamic-plugin-sdk';
import { useODFNamespaceSelector } from '../redux';

type UseSafeK8sWatchResource = <
  R extends K8sResourceCommon | K8sResourceCommon[],
>(
  initResource: K8sResourceObj | null,
  allowFallback?: boolean
) => WatchK8sResult<R>;

/**
 * Wrapper around "useK8sWatchResource" hook.
 * Ensures no API request is made unless its "safe" to do so (ODF installed namespace is fetched successfully).
 */
export const useSafeK8sWatchResource: UseSafeK8sWatchResource = (
  initResource,
  allowFallback = false
) => {
  const { odfNamespace, isNsSafe, isFallbackSafe } = useODFNamespaceSelector();

  const canUseFallback = allowFallback && isFallbackSafe;
  return useK8sWatchResource(
    getValidWatchK8sResourceObj(
      initResource(odfNamespace),
      isNsSafe || canUseFallback
    )
  );
};
