export enum StorageDashboard {
  USED_CAPACITY_FILE_BLOCK = 'USED_CAP_FB',
  TOTAL_CAP_FILE_BLOCK = 'TOTAL_CAP_FB',
  USED_CAPACITY_OBJECT = 'USED_CAP_OBJ',
  IOPS = 'IOPS',
  LATENCY = 'LATENCY',
  THROUGHPUT = 'THROUGHPUT',
}

export const CAPACITY_QUERIES = {
  [StorageDashboard.TOTAL_CAP_FILE_BLOCK]:
    'odf_system_raw_capacity_total_bytes',
  [StorageDashboard.USED_CAPACITY_FILE_BLOCK]:
    'odf_system_raw_capacity_used_bytes',
  [StorageDashboard.USED_CAPACITY_OBJECT]: 'NooBaa_providers_physical_size',
};

export const UTILIZATION_QUERY = {
  [StorageDashboard.IOPS]:
    'odf_system_iops_total_bytes',
  [StorageDashboard.LATENCY]:
    'odf_system_latency_seconds',
  [StorageDashboard.THROUGHPUT]:
    'odf_system_throughput_total_bytes',
};
