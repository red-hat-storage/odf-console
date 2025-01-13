import { ODR_CLUSTER_OPERATOR, VOL_SYNC } from '@odf/mco/constants';
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
  POD_STATUS_ALL_WHITELISTED = 'POD_STATUS_ALL_WHITELISTED',
}

export enum DRDashboard {
  RBD_SNAPSHOTS_SYNC_BYTES = 'RBD_SNAPSHOTS_SYNC_BYTES',
  RBD_SNAPSHOT_SNAPSHOTS = 'RBD_SNAPSHOT_SNAPSHOTS',
}

export const LAST_SYNC_TIME_QUERY = 'ramen_sync_duration_seconds';
export const getLastSyncPerClusterQuery = () =>
  `${LAST_SYNC_TIME_QUERY}{${DRPC_OBJECT_TYPE}, ${RAMEN_HUB_OPERATOR_METRICS_SERVICE}}`;

export const CAPACITY_QUERIES = {
  // ToDo (epic 4422): Need to update as per updates in the metrics (if needed/once confirmed).
  // Assuming "namespace" in "odf_system.*"" metrics (except "odf_system_map" which is pushed by ODF opr and already has "target_namespace") is where system is deployed.
  [StorageDashboard.TOTAL_CAPACITY_FILE_BLOCK]: `(label_replace(odf_system_map, "managedBy", "$1", "target_name", "(.*)"))  * on (target_namespace, managedBy, cluster) group_right(storage_system, target_kind) (label_replace(${TOTAL_CAPACITY_FILE_BLOCK_METRIC}, "target_namespace", "$1", "namespace", "(.*)"))`,
  [StorageDashboard.USED_CAPACITY_FILE_BLOCK]: `(label_replace(odf_system_map, "managedBy", "$1", "target_name", "(.*)"))  * on (target_namespace, managedBy, cluster) group_right(storage_system, target_kind) (label_replace(${USED_CAPACITY_FILE_BLOCK_METRIC}, "target_namespace", "$1", "namespace", "(.*)"))`,
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

export const STATUS_QUERIES = {
  // ToDo (epic 4422): Need to update as per updates in the metrics (if needed/once confirmed).
  // Assuming "namespace" in "odf_system.*"" metrics (except "odf_system_map" which is pushed by ODF opr and already has "target_namespace") is where system is deployed.
  [StorageDashboard.SYSTEM_HEALTH]: `(label_replace(odf_system_map, "managedBy", "$1", "target_name", "(.*)"))  * on (target_namespace, managedBy, cluster) group_right(storage_system, target_kind) (label_replace(${SYSTEM_HEALTH_METRIC}, "target_namespace", "$1", "namespace", "(.*)"))`,
  [StorageDashboard.HEALTH]: SYSTEM_HEALTH_METRIC,
  [StorageDashboard.CSV_STATUS]: `csv_succeeded{name=~"${ODF_OPERATOR}.*"}`,
  // To enhance operator CSV monitoring, update the query to: csv_succeeded{name=~"odr-cluster-operator.*|name.*"}
  [StorageDashboard.CSV_STATUS_ALL_WHITELISTED]: `csv_succeeded{name=~"${ODR_CLUSTER_OPERATOR}.*"}`,
  // To enhance operator Pod monitoring, update the query to: kube_running_pod_ready{pod=~"${VOL_SYNC}.*|pod.*"}
  [StorageDashboard.POD_STATUS_ALL_WHITELISTED]: `kube_running_pod_ready{pod=~"${VOL_SYNC}.*"}`,
};
