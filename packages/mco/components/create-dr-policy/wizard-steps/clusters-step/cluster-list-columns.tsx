import { ManagedClusterInfoType } from '@odf/mco/types';
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
  DataFoundation,
  StorageProvisioners,
  StorageClients,
}

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
    columnName: t('Data Foundation'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'odfInfo.odfVersion'),
  },
  {
    columnName: t('Storage provisioners'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'storageProvisionersCount'),
  },
  {
    columnName: t('Storage clients'),
    sortFunction: (a, b, c) => sortRows(a, b, c, 'storageClientsCount'),
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
    case ClusterListColumns.DataFoundation:
      return columns[2];
    case ClusterListColumns.StorageProvisioners:
      return columns[3];
    case ClusterListColumns.StorageClients:
      return columns[4];
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
