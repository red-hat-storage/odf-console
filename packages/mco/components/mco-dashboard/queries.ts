import { ODF_OPERATOR } from '@odf/shared/constants';
import {
  TOTAL_CAPACITY_FILE_BLOCK_METRIC,
  USED_CAPACITY_FILE_BLOCK_METRIC,
  SYSTEM_HEALTH_METRIC,
} from '@odf/shared/queries';

export const RAMEN_HUB_OPERATOR_METRICS_SERVICE =
  'job="ramen-hub-operator-metrics-service"';
export const DRPC_OBJECT_TYPE = 'obj_type="DRPlacementControl"';

export enum StorageDashboard {
  USED_CAPACITY_FILE_BLOCK = 'USED_CAPACITY_FILE_BLOCK',
  TOTAL_CAPACITY_FILE_BLOCK = 'TOTAL_CAPACITY_FILE_BLOCK',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  CSV_STATUS = 'CSV_STATUS',
  CSV_STATUS_ALL_WHITELISTED = 'CSV_STATUS_ALL_WHITELISTED',
  HEALTH = 'HEALTH',
}

export enum DRDashboard {
  RBD_SNAPSHOTS_SYNC_BYTES = 'RBD_SNAPSHOTS_SYNC_BYTES',
  RBD_SNAPSHOT_SNAPSHOTS = 'RBD_SNAPSHOT_SNAPSHOTS',
}

export const LAST_SYNC_TIME_QUERY = 'ramen_sync_duration_seconds';
export const getLastSyncPerClusterQuery = () =>
  `${LAST_SYNC_TIME_QUERY}{${DRPC_OBJECT_TYPE}, ${RAMEN_HUB_OPERATOR_METRICS_SERVICE}}`;

// ToDo (epic 4422): Need to update as per updates in the metrics
export const CAPACITY_QUERIES = {
  // ToDo (epic 4422): For 4.15, Assuming "managedBy" is unique for each StorageSystem. Need to add "target_namesapce" as an another key.
  [StorageDashboard.TOTAL_CAPACITY_FILE_BLOCK]: `(label_replace(odf_system_map, "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system, target_kind, target_namespace) ${TOTAL_CAPACITY_FILE_BLOCK_METRIC}`,
  [StorageDashboard.USED_CAPACITY_FILE_BLOCK]: `(label_replace(odf_system_map, "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system, target_kind, target_namespace) ${USED_CAPACITY_FILE_BLOCK_METRIC}`,
};

export const getRBDSnapshotUtilizationQuery = (
  clusterNames: string[],
  queryName: DRDashboard
) => {
  const names = clusterNames.join('|');
  const queries = {
    [DRDashboard.RBD_SNAPSHOT_SNAPSHOTS]: `idelta(ceph_rbd_mirror_snapshot_snapshots{cluster=~"${names}"}[15m])`,
    [DRDashboard.RBD_SNAPSHOTS_SYNC_BYTES]: `idelta(ceph_rbd_mirror_snapshot_sync_bytes{cluster=~"${names}"}[15m])`,
  };
  return queries[queryName];
};

// ToDo (epic 4422): Need to update as per updates in the metrics
export const STATUS_QUERIES = {
  // ToDo (epic 4422): For 4.15, Assuming "managedBy" is unique for each StorageSystem. Need to add "target_namesapce" as an another key.
  [StorageDashboard.SYSTEM_HEALTH]: `(label_replace(odf_system_map, "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system, target_kind, target_namespace) ${SYSTEM_HEALTH_METRIC}`,
  [StorageDashboard.HEALTH]: SYSTEM_HEALTH_METRIC,
  [StorageDashboard.CSV_STATUS]: `csv_succeeded{name=~"${ODF_OPERATOR}.*"}`,
  [StorageDashboard.CSV_STATUS_ALL_WHITELISTED]: 'csv_succeeded',
};
