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
}

export enum ScaleHealthStatus {
  HEALTHY = 10,
  DEGRADED = 20,
  FAILED = 40,
}

export const SCALE_QUERIES: { [key in ScaleQueries]: string } = {
  [ScaleQueries.RAW_CAPACITY]:
    'max by (gpfs_cluster_name, gpfs_fs_name, gpfs_diskpool_name) (gpfs_pool_total_dataKB * on(gpfs_fs_name) group_left(gpfs_cluster_name) (max by(gpfs_fs_name, gpfs_cluster_name) (gpfs_fs_read_ops) * 0 + 1)) * 1024',
  [ScaleQueries.USED_CAPACITY]:
    'max by (gpfs_cluster_name, gpfs_fs_name, gpfs_diskpool_name) ((gpfs_pool_total_dataKB - gpfs_pool_free_dataKB) * on(gpfs_fs_name) group_left(gpfs_cluster_name) (max by(gpfs_fs_name, gpfs_cluster_name) (gpfs_fs_read_ops) * 0 + 1)) * 1024',
  [ScaleQueries.IOPS]:
    'max by (gpfs_cluster_name, gpfs_fs_name, instance, job) (rate(gpfs_fs_read_ops[1m]) + rate(gpfs_fs_write_ops[1m]))',
  [ScaleQueries.THROUGHPUT]:
    'max by (gpfs_cluster_name, gpfs_fs_name, instance, job) (rate(gpfs_fs_bytes_read[1m]) + rate(gpfs_fs_bytes_written[1m]))',
  [ScaleQueries.LATENCY]:
    'max by (gpfs_cluster_name, gpfs_fs_name, instance, job) ((gpfs_fs_tot_disk_wait_rd + gpfs_fs_tot_disk_wait_wr) / ((gpfs_fs_read_ops + gpfs_fs_write_ops) > 0))',
  [ScaleQueries.HEALTH]:
    'max by (gpfs_cluster_name, gpfs_health_entity) (gpfs_health_status{gpfs_health_component="FILESYSTEM", gpfs_health_entity=~"[^-].*"} * on(node, gpfs_health_entity) group_left(gpfs_cluster_name) (label_replace(max by(node, gpfs_cluster_name, gpfs_fs_name) (gpfs_fs_read_ops), "gpfs_health_entity", "$1", "gpfs_fs_name", "(.*)") * 0 + 1))',
};
