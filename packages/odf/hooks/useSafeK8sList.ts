import { useK8sList } from '@odf/shared';
import { getValidK8sOptions } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { useODFNamespaceSelector } from '../redux';

/**
 * Wrapper around "useK8sList" hook.
 * Ensures no API request is made unless its "safe" to do so (ODF installed namespace is fetched successfully).
 */
export const useSafeK8sList = <R extends K8sResourceCommon = K8sResourceCommon>(
  kind: K8sKind,
  namespace?: string,
  allowFallback = false
): [R[], boolean, unknown] => {
  const { odfNamespace, isNsSafe, isFallbackSafe } = useODFNamespaceSelector();

  const canUseFallback = allowFallback && isFallbackSafe;
  const k8sListArgs = getValidK8sOptions(
    isNsSafe || canUseFallback,
    kind,
    namespace || odfNamespace
  ) as [K8sKind, string];
  return useK8sList<R>(...k8sListArgs);
};
