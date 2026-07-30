import { StorageClusterModel } from '@odf/shared/models';
import { referenceForModel } from '@odf/shared/utils';

export const ATTACH_STORAGE_SUB_ROUTE = '~attachstorage';
export const CONFIGURE_PERFORMANCE_PROFILE_SUB_ROUTE =
  '~configureperformanceprofile';

export const getStorageClusterBaseRoute = (
  namespace: string,
  resourceName: string
): string =>
  `/odf/system/ns/${namespace}/${referenceForModel(
    StorageClusterModel
  )}/${resourceName}`;

export const getAttachStorageRoute = (
  namespace: string,
  resourceName: string
): string =>
  `${getStorageClusterBaseRoute(namespace, resourceName)}/${ATTACH_STORAGE_SUB_ROUTE}`;

export const getConfigurePerformanceProfileRoute = (
  namespace: string,
  resourceName: string
): string =>
  `${getStorageClusterBaseRoute(namespace, resourceName)}/${CONFIGURE_PERFORMANCE_PROFILE_SUB_ROUTE}`;
