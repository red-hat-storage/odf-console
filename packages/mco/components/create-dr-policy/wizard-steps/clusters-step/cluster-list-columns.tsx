import { ManagedClusterInfoType } from '@odf/mco/types';
import { StorageVendorId } from '@odf/mco/utils/storage-vendor-registry';
import { getName } from '@odf/shared/selectors';
import { sortRows } from '@odf/shared/utils';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { MAX_ALLOWED_CLUSTERS } from '../../../../constants';

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
  if (cluster.storageProviders?.odf) ids.push('data-foundation');
  if (cluster.storageProviders?.scale) ids.push('ibm-storage-scale');
  return ids;
};

const getStorageProviderSortKey = (cluster: ManagedClusterInfoType): string => {
  const vendorIds = getClusterVendorIds(cluster);
  const thirdParty = (cluster.providers || []).map((p) =>
    p.displayName.toLowerCase()
  );
  return [...vendorIds, ...thirdParty].sort().join(',');
};

export const getColumns = (t: TFunction<string>) => [
  {
    columnName: t('Managed Cluster'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'metadata.name'),
  },
  {
    columnName: t('Availability status'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'isManagedClusterAvailable'),
  },
  {
    columnName: t('Storage provider'),
    sortFunction: (a: ManagedClusterInfoType, b: ManagedClusterInfoType, c) => {
      const aKey = getStorageProviderSortKey(a);
      const bKey = getStorageProviderSortKey(b);
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

export const isRowSelectable = (
  cluster: K8sResourceCommon,
  selectedClusters: ManagedClusterInfoType[]
) =>
  selectedClusters.length < MAX_ALLOWED_CLUSTERS ||
  !!selectedClusters.find(
    (selectedCluster) => getName(selectedCluster) === getName(cluster)
  );
