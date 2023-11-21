export enum StorageDashboardQuery {
  RAW_CAPACITY_TOTAL = 'RAW_TOTAL_CAPACITY',
  RAW_CAPACITY_USED = 'RAW_CAPACITY_USED',
}

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const CAPACITY_INFO_QUERIES = (managedByOCS: string) => ({
  [StorageDashboardQuery.RAW_CAPACITY_TOTAL]: `ceph_cluster_total_bytes{managedBy="${managedByOCS}"}`,
  [StorageDashboardQuery.RAW_CAPACITY_USED]: `ceph_cluster_total_used_raw_bytes{managedBy="${managedByOCS}"}`,
});
