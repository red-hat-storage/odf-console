import {
  TOTAL_CAPACITY_FILE_BLOCK_METRIC,
  USED_CAPACITY_FILE_BLOCK_METRIC,
  SYSTEM_HEALTH_METRIC,
} from '@odf/shared/queries';
import { HUB_CLUSTER_NAME } from '../../constants';

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

// "recording_rules" added in "observability-metrics-custom-allowlist" ConfigMap
export const TOTAL_PVC_COUNT_QUERY = 'count_persistentvolumeclaim_total';
export const getTotalPVCCountPerClusterQuery = (clusterName: string) =>
  `${TOTAL_PVC_COUNT_QUERY}{cluster="${clusterName}"}`;

export const LAST_SYNC_TIME_QUERY = 'ramen_sync_duration_seconds';
export const getLastSyncPerClusterQuery = () =>
  `${LAST_SYNC_TIME_QUERY}{${DRPC_OBJECT_TYPE}, ${RAMEN_HUB_OPERATOR_METRICS_SERVICE}, cluster="${HUB_CLUSTER_NAME}"}`;

export const CAPACITY_QUERIES = {
  [StorageDashboard.TOTAL_CAPACITY_FILE_BLOCK]: `(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system, target_kind) ${TOTAL_CAPACITY_FILE_BLOCK_METRIC}`,
  [StorageDashboard.USED_CAPACITY_FILE_BLOCK]: `(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system, target_kind) ${USED_CAPACITY_FILE_BLOCK_METRIC}`,
};

export const STATUS_QUERIES = {
  [StorageDashboard.SYSTEM_HEALTH]: `(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system, target_kind) ${SYSTEM_HEALTH_METRIC}`,
  [StorageDashboard.HEALTH]: SYSTEM_HEALTH_METRIC,
  [StorageDashboard.CSV_STATUS]:
    'csv_succeeded{exported_namespace="openshift-storage"}',
  [StorageDashboard.CSV_STATUS_ALL_WHITELISTED]: 'csv_succeeded',
};
