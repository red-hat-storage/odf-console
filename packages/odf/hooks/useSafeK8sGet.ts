import { useK8sGet } from '@odf/shared';
import { getValidK8sOptions } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { useODFNamespaceSelector } from '../redux';

/**
 * Wrapper around "useK8sGet" hook.
 * Ensures no API request is made unless its "safe" to do so (ODF installed namespace is fetched successfully).
 */
export const useSafeK8sGet = <R extends K8sResourceCommon = K8sResourceCommon>(
  kind: K8sKind,
  name?: string,
  namespace?: string,
  cluster?: string,
  allowFallback = false
): [R, boolean, unknown] => {
  const { odfNamespace, isNsSafe, isFallbackSafe } = useODFNamespaceSelector();

  const canUseFallback = allowFallback && isFallbackSafe;
  const k8sGetArgs = getValidK8sOptions(
    isNsSafe || canUseFallback,
    kind,
    name,
    namespace || odfNamespace,
    cluster
  ) as [K8sKind, string, string, string];
  return useK8sGet<R>(...k8sGetArgs);
};
