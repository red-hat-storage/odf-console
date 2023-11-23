import { getValidWatchK8sResourcesObj } from '@odf/shared/utils';
import {
  useK8sWatchResources,
  WatchK8sResources,
  ResourcesObject,
  WatchK8sResults,
} from '@openshift-console/dynamic-plugin-sdk';
import { useODFNamespaceSelector } from '../redux';

type UseSafeK8sWatchResources = (
  initResources: (ns: string) => WatchK8sResources<ResourcesObject>,
  allowFallback?: boolean
) => WatchK8sResults<ResourcesObject>;

/**
 * Wrapper around "useK8sWatchResources" hook.
 * Ensures no API request is made unless its "safe" to do so (ODF installed namespace is fetched successfully).
 */
export const useSafeK8sWatchResources: UseSafeK8sWatchResources = (
  initResources,
  allowFallback = false
) => {
  const { odfNamespace, isNsSafe, isFallbackSafe } = useODFNamespaceSelector();

  const canUseFallback = allowFallback && isFallbackSafe;
  return useK8sWatchResources(
    getValidWatchK8sResourcesObj(
      initResources(odfNamespace),
      isNsSafe || canUseFallback
    )
  );
};
