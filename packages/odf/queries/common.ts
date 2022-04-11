export enum StorageDashboardQuery {
  RAW_CAPACITY_TOTAL = 'RAW_TOTAL_CAPACITY',
  RAW_CAPACITY_USED = 'RAW_CAPACITY_USED',
}

export const CAPACITY_INFO_QUERIES = {
  [StorageDashboardQuery.RAW_CAPACITY_TOTAL]: 'ceph_cluster_total_bytes',
  [StorageDashboardQuery.RAW_CAPACITY_USED]:
    'ceph_cluster_total_used_raw_bytes',
};
