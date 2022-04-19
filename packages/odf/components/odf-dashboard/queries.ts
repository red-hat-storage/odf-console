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

export const STATUS_QUERIES = {
  [StorageDashboard.HEALTH]: `(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy) group_right(storage_system) ${SYSTEM_HEALTH_METRIC}`,
};
