export enum StorageDashboardQuery {
  RESILIENCY_PROGRESS = 'RESILIENCY_PROGRESS',
}

export const DATA_RESILIENCY_QUERY = {
  [StorageDashboardQuery.RESILIENCY_PROGRESS]: '(ceph_pg_clean and ceph_pg_active)/ceph_pg_total',
};
