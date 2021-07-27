export enum StorageDashboard {
  USED_CAPACITY_FILE_BLOCK = 'USED_CAP_FB',
  TOTAL_CAP_FILE_BLOCK = 'TOTAL_CAP_FB',
  USED_CAPACITY_OBJECT = 'USED_CAP_OBJ',
  IOPS = 'IOPS',
  LATENCY = 'LATENCY',
  THROUGHPUT = 'THROUGHPUT',
}

export const CAPACITY_QUERIES = {
  [StorageDashboard.TOTAL_CAP_FILE_BLOCK]: 'ceph_cluster_total_bytes',
  [StorageDashboard.USED_CAPACITY_FILE_BLOCK]:
    'sum(kubelet_volume_stats_used_bytes * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)"}))',
  [StorageDashboard.USED_CAPACITY_OBJECT]: 'NooBaa_providers_physical_size',
};

export const UTILIZATION_QUERY = {
  [StorageDashboard.IOPS]:
    '(sum(rate(ceph_pool_wr[1m])) + sum(rate(ceph_pool_rd[1m])))',
  [StorageDashboard.LATENCY]:
    '(quantile(.95,(cluster:ceph_disk_latency:join_ceph_node_disk_irate1m)))',
  [StorageDashboard.THROUGHPUT]:
    '(sum(rate(ceph_pool_wr_bytes[1m]) + rate(ceph_pool_rd_bytes[1m])))',
};
