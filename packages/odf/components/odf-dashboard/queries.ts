import {
  TOTAL_CAPACITY_FILE_BLOCK_METRIC,
  USED_CAPACITY_FILE_BLOCK_METRIC,
  SYSTEM_HEALTH_METRIC,
} from '@odf/shared/queries';

export enum StorageDashboard {
  USED_CAPACITY_FILE_BLOCK = 'USED_CAPACITY_FILE_BLOCK',
  TOTAL_CAPACITY_FILE_BLOCK = 'TOTAL_CAPACITY_FILE_BLOCK',
  USED_CAPACITY_OBJECT = 'USED_CAPACITY_OBJECT',
  IOPS = 'IOPS',
  LATENCY = 'LATENCY',
  THROUGHPUT = 'THROUGHPUT',
  HEALTH = 'HEALTH',
}

export const CAPACITY_QUERIES = {
  [StorageDashboard.TOTAL_CAPACITY_FILE_BLOCK]:
    TOTAL_CAPACITY_FILE_BLOCK_METRIC,
  [StorageDashboard.USED_CAPACITY_FILE_BLOCK]: USED_CAPACITY_FILE_BLOCK_METRIC,
  [StorageDashboard.USED_CAPACITY_OBJECT]: 'NooBaa_providers_physical_size',
};

export const UTILIZATION_QUERY = {
  [StorageDashboard.IOPS]: 'odf_system_iops_total_bytes',
  [StorageDashboard.LATENCY]: 'odf_system_latency_seconds',
  [StorageDashboard.THROUGHPUT]: 'odf_system_throughput_total_bytes',
};

// ToDo (epic 4422): Need to update as per updates in the metrics (if needed/once confirmed).
// Assuming "namespace" in "odf_system.*"" metrics (except "odf_system_map" which is pushed by ODF opr and already has "target_namespace") is where system is deployed.
export const STATUS_QUERIES = {
  [StorageDashboard.HEALTH]: `(label_replace(odf_system_map, "managedBy", "$1", "target_name", "(.*)"))  * on (target_namespace, managedBy) group_right(storage_system) (label_replace(${SYSTEM_HEALTH_METRIC}, "target_namespace", "$1", "namespace", "(.*)"))`,
};
