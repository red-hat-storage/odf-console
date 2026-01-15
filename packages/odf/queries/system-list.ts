export enum ODFQueries {
  LATENCY = 'LAT',
  IOPS = 'IOPS',
  THROUGHPUT = 'THROUGHPUT',
  RAW_CAPACITY = 'RAW_CAP',
  USED_CAPACITY = 'USED_CAP',
}

export const ODF_QUERIES: { [key in ODFQueries]: string } = {
  [ODFQueries.LATENCY]: 'odf_system_latency_seconds',
  [ODFQueries.IOPS]: 'odf_system_iops_total_bytes',
  [ODFQueries.THROUGHPUT]: 'odf_system_throughput_total_bytes',
  [ODFQueries.RAW_CAPACITY]: 'odf_system_raw_capacity_total_bytes',
  [ODFQueries.USED_CAPACITY]: 'odf_system_raw_capacity_used_bytes',
};

export enum ScaleQueries {
  LATENCY = 'SCALE_LAT',
  IOPS = 'SCALE_IOPS',
  THROUGHPUT = 'SCALE_THROUGHPUT',
  RAW_CAPACITY = 'SCALE_RAW_CAP',
  USED_CAPACITY = 'SCALE_USED_CAP',
  HEALTH = 'SCALE_HEALTH',
  FILESYSTEM_HEALTH = 'SCALE_FS_HEALTH',
}

export enum ScaleHealthStatus {
  HEALTHY = 10,
  DEGRADED = 20,
  FAILED = 40,
}

// Scale metrics preserve both gpfs_cluster_name and gpfs_fs_name for matching.
// SAN systems match by gpfs_cluster_name, RemoteCluster systems match by gpfs_fs_name.
// The max by deduplicates across HA replica pods.
// IOPS, throughput, and latency use rate() since the underlying metrics are counters.
export const SCALE_QUERIES: { [key in ScaleQueries]: string } = {
  [ScaleQueries.RAW_CAPACITY]:
    'max by (gpfs_cluster_name, gpfs_fs_name, gpfs_diskpool_name) (gpfs_pool_total_dataKB) * 1024',
  [ScaleQueries.USED_CAPACITY]:
    'max by (gpfs_cluster_name, gpfs_fs_name, gpfs_diskpool_name) (gpfs_pool_total_dataKB - gpfs_pool_free_dataKB) * 1024',
  [ScaleQueries.IOPS]:
    'max by (gpfs_cluster_name, gpfs_fs_name) (rate(gpfs_fs_read_ops[5m]) + rate(gpfs_fs_write_ops[5m]))',
  [ScaleQueries.THROUGHPUT]:
    'max by (gpfs_cluster_name, gpfs_fs_name) (rate(gpfs_fs_bytes_read[5m]) + rate(gpfs_fs_bytes_written[5m]))',
  [ScaleQueries.LATENCY]:
    'max by (gpfs_cluster_name, gpfs_fs_name) (rate(gpfs_fs_tot_disk_wait_rd[5m]) + rate(gpfs_fs_tot_disk_wait_wr[5m]))',
  [ScaleQueries.HEALTH]:
    'max by (gpfs_cluster_name) (gpfs_health_status{gpfs_health_component="GPFS"})',
  [ScaleQueries.FILESYSTEM_HEALTH]:
    'max by (gpfs_health_entity) (gpfs_health_status{gpfs_health_component="FILESYSTEM", gpfs_health_entity!="-"})',
};
