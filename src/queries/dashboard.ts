/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-shadow
export enum DashboardQueries {
  SYSTEM_CAPACITY_TOTAL = 'SYS_CAP_TOTAL',
  SYSTEM_CAPACITY_USED = 'SYS_CAP_USED',
  EXTERNAL_OBJ_CAP = 'EXTERNAL_OBJ_CAP',
}

type Queries = {
  [query in DashboardQueries]: string;
};

export const QUERIES: Queries = {
  [DashboardQueries.SYSTEM_CAPACITY_TOTAL]: 'ceph_cluster_total_bytes',
  [DashboardQueries.SYSTEM_CAPACITY_USED]: 'ceph_cluster_used_bytes',
  [DashboardQueries.EXTERNAL_OBJ_CAP]: 'ceph_cluster_used_bytes',
};
