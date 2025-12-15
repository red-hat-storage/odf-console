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
}

// Note: Scale metrics may have multiple pod instances (HA replicas) reporting the same data.
// We use max by (gpfs_cluster_name, gpfs_diskpool_name/gpfs_fs_name) first to deduplicate
// across instances, then aggregate by cluster.
export const SCALE_QUERIES: { [key in ScaleQueries]: string } = {
  [ScaleQueries.RAW_CAPACITY]:
    'sum by (gpfs_cluster_name) (max by (gpfs_cluster_name, gpfs_diskpool_name) (gpfs_pool_total_dataKB)) * 1024',
  [ScaleQueries.USED_CAPACITY]:
    'sum by (gpfs_cluster_name) (max by (gpfs_cluster_name, gpfs_diskpool_name) (gpfs_pool_total_dataKB - gpfs_pool_free_dataKB)) * 1024',
  [ScaleQueries.IOPS]:
    'sum by (gpfs_cluster_name) (max by (gpfs_cluster_name, gpfs_fs_name) (gpfs_fs_read_ops + gpfs_fs_write_ops))',
  [ScaleQueries.THROUGHPUT]:
    'sum by (gpfs_cluster_name) (max by (gpfs_cluster_name, gpfs_fs_name) (gpfs_fs_bytes_read + gpfs_fs_bytes_written))',
  [ScaleQueries.LATENCY]:
    'avg by (gpfs_cluster_name) (max by (gpfs_cluster_name, gpfs_fs_name) (gpfs_fs_tot_disk_wait_rd + gpfs_fs_tot_disk_wait_wr))',
};
