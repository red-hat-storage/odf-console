import { ManagedClusterInfoType } from '@odf/mco/types';
import { getName } from '@odf/shared/selectors';
import { sortRows } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { MAX_ALLOWED_CLUSTERS, StorageVendorId } from '../../../../constants';
import {
  getClusterProviderIds,
  getSharedProviderIds,
  getStorageVendorLabel,
} from '../../../../utils/storage-vendor-registry';

export const INITIAL_PAGE_NUMBER = 1;
export const COUNT_PER_PAGE_NUMBER = 10;

export enum ClusterListColumns {
  ManagedCluster,
  AvailabilityStatus,
  StorageProvider,
}

export const getClusterVendorIds = (
  cluster: ManagedClusterInfoType
): StorageVendorId[] => {
  const ids: StorageVendorId[] = [];
  if (cluster.storageProviders?.odf) ids.push(StorageVendorId.DataFoundation);
  if (cluster.storageProviders?.scale)
    ids.push(StorageVendorId.IbmStorageScale);
  if (cluster.providers?.length) ids.push(StorageVendorId.Generic);
  return ids;
};

export const getStorageProviderText = (
  cluster: ManagedClusterInfoType,
  t: TFunction<string>
): string =>
  getClusterVendorIds(cluster)
    .map((id) => getStorageVendorLabel(id, t))
    .join(', ');

export const getColumns = (t: TFunction<string>) => [
  {
    columnName: t('Managed cluster'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
  },
  {
    columnName: t('Availability status'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'isManagedClusterAvailable'),
  },
  {
    columnName: t('Storage provider'),
    sortFunction: (a: ManagedClusterInfoType, b: ManagedClusterInfoType, c) => {
      const aKey = getStorageProviderText(a, t);
      const bKey = getStorageProviderText(b, t);
      if (c === 'asc') return aKey.localeCompare(bKey);
      return bKey.localeCompare(aKey);
    },
  },
];

export const getColumnHelper = (
  name: ClusterListColumns,
  t: TFunction<string>
) => {
  const columns = getColumns(t);
  switch (name) {
    case ClusterListColumns.ManagedCluster:
      return columns[0];
    case ClusterListColumns.AvailabilityStatus:
      return columns[1];
    case ClusterListColumns.StorageProvider:
      return columns[2];
  }
};

/** A cluster can join the pair only if it shares a provider with the clusters already selected. */
export const isRowSelectable = (
  row: K8sResourceCommon,
  selectedClusters: ManagedClusterInfoType[]
) => {
  const cluster = row as ManagedClusterInfoType;
  if (
    selectedClusters.some((selected) => getName(selected) === getName(cluster))
  )
    return true;
  return (
    selectedClusters.length < MAX_ALLOWED_CLUSTERS &&
    getClusterProviderIds(cluster).length > 0 &&
    getSharedProviderIds([...selectedClusters, cluster]).length > 0
  );
};
