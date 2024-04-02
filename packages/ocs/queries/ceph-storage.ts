import {
  StorageClassModel,
  PodModel,
  ProjectModel,
  PersistentVolumeClaimModel,
} from '@odf/shared/models';
import {
  BreakdownCardFields,
  BreakdownCardFieldsValues,
  BreakdownCardFieldsWithParams,
  BreakdownCardQueryMap,
} from '@odf/shared/queries';

export enum StorageDashboardQuery {
  PROJECTS_BY_USED = 'PROJECTS_BY_USED',
  RESILIENCY_PROGRESS = 'RESILIENCY_PROGRESS',
  PROJECTS_TOTAL_USED = 'PROJECTS_TOTAL_USED',
  CEPH_CAPACITY_USED = 'CEPH_CAPACITY_USED',
  STORAGE_CLASSES_TOTAL_USED = 'STORAGE_CLASSES_TOTAL_USED',
  STORAGE_CLASSES_BY_USED = 'STORAGE_CLASSES_BY_USED',
  PVC_NAMESPACES_BY_USED = 'PVC_NAMESPACES_BY_USED',
  PVC_NAMESPACES_TOTAL_USED = 'PVC_NAMESPACES_TOTAL_USED',
  PODS_BY_USED = 'PODS_BY_USED',
  PODS_TOTAL_USED = 'PODS_TOTAL_USED',
  CEPH_CAPACITY_TOTAL = 'CEPH_CAPACITY_TOATL',
  CEPH_CAPACITY_AVAILABLE = 'CEPH_CAPACITY_AVAILABLE',
  // Capacity Info Card
  RAW_CAPACITY_TOTAL = 'RAW_TOTAL_CAPACITY',
  RAW_CAPACITY_USED = 'RAW_CAPACITY_USED',
  // Pool Info
  POOL_CAPACITY_RATIO = 'POOL_CAPACITY_RATIO',
  POOL_SAVED_CAPACITY = 'POOL_SAVED_CAPACITY',
  // Utilization Queries
  UTILIZATION_IOPS_READ_QUERY = 'UTILIZATION_IOPS_READ_QUERY',
  UTILIZATION_IOPS_WRITE_QUERY = 'UTILIZATION_IOPS_WRITE_QUERY',
  UTILIZATION_LATENCY_READ_QUERY = 'UTILIZATION_LATENCY_READ_QUERY',
  UTILIZATION_LATENCY_WRITE_QUERY = 'UTILIZATION_LATENCY_WRITE_QUERY',
  UTILIZATION_THROUGHPUT_READ_QUERY = 'UTILIZATION_THROUGHPUT_READ_QUERY',
  UTILIZATION_THROUGHPUT_WRITE_QUERY = 'UTILIZATION_THROUGHPUT_WRITE_QUERY',
  UTILIZATION_RECOVERY_RATE_QUERY = 'UTILIZATION_RECOVERY_RATE_QUERY',
  USED_CAPACITY = 'USED_CAPACITY',
  REQUESTED_CAPACITY = 'REQUESTED_CAPACITY',
  // Pool Compression Details
  POOL_COMPRESSION_SAVINGS = 'POOL_COMPRESSION_SAVINGS',
  POOL_COMPRESSION_RATIO = 'POOL_COMPRESSION_RATIO',
  POOL_COMPRESSION_ELIGIBILITY = 'POOL_COMPRESSION_ELIGIBILITY',
  POOL_RAW_CAPACITY_USED = 'POOL_RAW_CAPACITY_USED',
  POOL_MAX_CAPACITY_AVAILABLE = 'POOL_MAX_CAPACITY_AVAILABLE',
  POOL_UTILIZATION_IOPS_QUERY = 'POOL_UTILIZATION_IOPS_QUERY',
  POOL_UTILIZATION_THROUGHPUT_QUERY = 'POOL_UTILIZATION_THROUGHPUT_QUERY',
  // Capacity Trend Queries
  UTILIZATION_1D = 'UTILIZATION_1D',
  UTILIZATION_VECTOR = 'UTILIZATION_VECTOR',
  UPTIME_DAYS = 'UPTIME_DAYS',
  RAW_CAPACITY_AVAILABLE = 'RAW_CAPACITY_AVAILABLE',
}

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const DATA_RESILIENCY_QUERY = (managedByOCS: string) => ({
  [StorageDashboardQuery.RESILIENCY_PROGRESS]: `(ceph_pg_clean{managedBy="${managedByOCS}"} and ceph_pg_active{managedBy="${managedByOCS}"})/ceph_pg_total{managedBy="${managedByOCS}"}`,
});

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const CEPH_CAPACITY_BREAKDOWN_QUERIES = (
  storageClassNamePrefix: string,
  managedByOCS?: string
) => ({
  [StorageDashboardQuery.PROJECTS_TOTAL_USED]: `sum(sum(topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes) * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"})) by (namespace))`,
  [StorageDashboardQuery.PROJECTS_BY_USED]: `sum(topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes) * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"})) by (namespace)`,
  [StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED]: `sum(sum(topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes) * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"})) by (storageclass, provisioner))`,
  [StorageDashboardQuery.STORAGE_CLASSES_BY_USED]: `sum(topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes) * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"})) by (storageclass, provisioner)`,
  [StorageDashboardQuery.PODS_TOTAL_USED]: `sum (((max by(namespace,persistentvolumeclaim) (kubelet_volume_stats_used_bytes)) * on (namespace,persistentvolumeclaim) group_right() ((kube_running_pod_ready*0+1) * on(namespace, pod)  group_right() kube_pod_spec_volumes_persistentvolumeclaims_info)) * on(namespace,persistentvolumeclaim) group_left(provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"}))`,
  [StorageDashboardQuery.PODS_BY_USED]: `sum by(namespace,pod) (((max by(namespace,persistentvolumeclaim) (kubelet_volume_stats_used_bytes)) * on (namespace,persistentvolumeclaim) group_right() ((kube_running_pod_ready*0+1) * on(namespace, pod)  group_right() kube_pod_spec_volumes_persistentvolumeclaims_info)) * on(namespace,persistentvolumeclaim) group_left(provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"}))`,
  [StorageDashboardQuery.CEPH_CAPACITY_TOTAL]: `ceph_cluster_total_bytes{managedBy="${managedByOCS}"}`,
  [StorageDashboardQuery.CEPH_CAPACITY_USED]: `sum(topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes) * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)",storageclass=~"${storageClassNamePrefix}.*"}))`,
  [StorageDashboardQuery.CEPH_CAPACITY_AVAILABLE]: `max(ceph_pool_max_avail{managedBy="${managedByOCS}"} * on (pool_id) group_left(name)ceph_pool_metadata{name=~"(.*file.*)|(.*block.*)",managedBy="${managedByOCS}"})`,
});

export const breakdownQueryMapCEPH = (
  storageClassNamePrefix: string,
  managedByOCS: string
): BreakdownCardQueryMap => ({
  [BreakdownCardFields.PROJECTS]: {
    model: ProjectModel,
    metric: 'namespace',
    queries: {
      [StorageDashboardQuery.PROJECTS_BY_USED]: `(topk(6,(${
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix, managedByOCS)[
          StorageDashboardQuery.PROJECTS_BY_USED
        ]
      })))`,
      [StorageDashboardQuery.PROJECTS_TOTAL_USED]:
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix, managedByOCS)[
          StorageDashboardQuery.PROJECTS_TOTAL_USED
        ],
      [StorageDashboardQuery.CEPH_CAPACITY_USED]:
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix, managedByOCS)[
          StorageDashboardQuery.CEPH_CAPACITY_USED
        ],
    },
  },
  [BreakdownCardFields.STORAGE_CLASSES]: {
    model: StorageClassModel,
    metric: 'storageclass',
    queries: {
      [StorageDashboardQuery.STORAGE_CLASSES_BY_USED]: `(topk(6,(${
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix, managedByOCS)[
          StorageDashboardQuery.STORAGE_CLASSES_BY_USED
        ]
      })))`,
      [StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED]:
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix, managedByOCS)[
          StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED
        ],
      [StorageDashboardQuery.CEPH_CAPACITY_USED]:
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix, managedByOCS)[
          StorageDashboardQuery.CEPH_CAPACITY_USED
        ],
    },
  },
  [BreakdownCardFields.PODS]: {
    model: PodModel,
    metric: 'pod',
    queries: {
      [StorageDashboardQuery.PODS_BY_USED]: `(topk(6,(${
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix, managedByOCS)[
          StorageDashboardQuery.PODS_BY_USED
        ]
      })))`,
      [StorageDashboardQuery.PODS_TOTAL_USED]: CEPH_CAPACITY_BREAKDOWN_QUERIES(
        storageClassNamePrefix,
        managedByOCS
      )[StorageDashboardQuery.PODS_TOTAL_USED],
      [StorageDashboardQuery.CEPH_CAPACITY_USED]:
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix, managedByOCS)[
          StorageDashboardQuery.CEPH_CAPACITY_USED
        ],
    },
  },
});

export const getBreakdownMetricsQuery = (
  metricType: BreakdownCardFieldsWithParams | BreakdownCardFields,
  storageClassNamePrefix: string,
  namespace?: string,
  isExternal?: boolean,
  managedByOCS?: string
): BreakdownCardFieldsValues => {
  if (metricType === BreakdownCardFieldsWithParams.PVCS) {
    return {
      model: PersistentVolumeClaimModel,
      metric: 'persistentvolumeclaim',
      queries: getPVCNamespaceQuery(namespace, storageClassNamePrefix),
    };
  }
  return !isExternal
    ? breakdownQueryMapCEPH(storageClassNamePrefix, managedByOCS)[metricType]
    : breakdownIndependentQueryMap(storageClassNamePrefix)[metricType];
};

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const CAPACITY_INFO_QUERIES = (managedByOCS: string) => ({
  [StorageDashboardQuery.RAW_CAPACITY_TOTAL]: `ceph_cluster_total_bytes{managedBy="${managedByOCS}"}`,
  [StorageDashboardQuery.RAW_CAPACITY_USED]: `ceph_cluster_total_used_raw_bytes{managedBy="${managedByOCS}"}`,
});

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const POOL_STORAGE_EFFICIENCY_QUERIES = (managedByOCS: string) => ({
  [StorageDashboardQuery.POOL_CAPACITY_RATIO]: `sum(ceph_bluestore_bluestore_compressed_original{managedBy="${managedByOCS}"}) / clamp_min(sum(ceph_bluestore_bluestore_compressed_allocated{managedBy="${managedByOCS}"}),1)`,
  [StorageDashboardQuery.POOL_SAVED_CAPACITY]: `(sum(ceph_bluestore_bluestore_compressed_original{managedBy="${managedByOCS}"}) - sum(ceph_bluestore_bluestore_compressed_allocated{managedBy="${managedByOCS}"}))`,
});

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const UTILIZATION_QUERY = (
  managedByOCS: string,
  storageClassNamePrefix?: string
) => ({
  [StorageDashboardQuery.CEPH_CAPACITY_USED]: `sum(topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes) * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)",storageclass=~"${storageClassNamePrefix}.*"}))`,
  [StorageDashboardQuery.UTILIZATION_IOPS_READ_QUERY]: {
    query: `sum(rate(ceph_pool_rd{managedBy="${managedByOCS}"}[1m]))`,
    desc: 'Reads',
  },
  [StorageDashboardQuery.UTILIZATION_IOPS_WRITE_QUERY]: {
    query: `sum(rate(ceph_pool_wr{managedBy="${managedByOCS}"}[1m]))`,
    desc: 'Writes',
  },
  [StorageDashboardQuery.UTILIZATION_LATENCY_READ_QUERY]: {
    query: `cluster:ceph_disk_latency_read:join_ceph_node_disk_rate1m{managedBy="${managedByOCS}"}`,
    desc: 'Reads',
  },
  [StorageDashboardQuery.UTILIZATION_LATENCY_WRITE_QUERY]: {
    query: `cluster:ceph_disk_latency_write:join_ceph_node_disk_rate1m{managedBy="${managedByOCS}"}`,
    desc: 'Writes',
  },
  [StorageDashboardQuery.UTILIZATION_THROUGHPUT_READ_QUERY]: {
    query: `sum(rate(ceph_pool_rd_bytes{managedBy="${managedByOCS}"}[1m]))`,
    desc: 'Reads',
  },
  [StorageDashboardQuery.UTILIZATION_THROUGHPUT_WRITE_QUERY]: {
    query: `sum(rate(ceph_pool_wr_bytes{managedBy="${managedByOCS}"}[1m]))`,
    desc: 'Writes',
  },
  [StorageDashboardQuery.UTILIZATION_RECOVERY_RATE_QUERY]: `(sum(ceph_pool_recovering_bytes_per_sec{managedBy="${managedByOCS}"}))`,
});

export const utilizationPopoverQueryMap = (storageClassNamePrefix: string) => [
  {
    model: ProjectModel,
    metric: 'namespace',
    query: `(sort_desc(topk(25,(${
      CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix)[
        StorageDashboardQuery.PROJECTS_BY_USED
      ]
    }))))`,
  },
  {
    model: StorageClassModel,
    metric: 'storageclass',
    query: `(sort_desc(topk(25,(${
      CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix)[
        StorageDashboardQuery.STORAGE_CLASSES_BY_USED
      ]
    }))))`,
  },
  {
    model: PodModel,
    metric: 'pod',
    query: `(sort_desc(topk(25, (${
      CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix)[
        StorageDashboardQuery.PODS_BY_USED
      ]
    }))))`,
  },
];

export const getPVCNamespaceQuery = (
  namespace: string = '',
  storageClassNamePrefix: string
) => {
  const queries = {
    [StorageDashboardQuery.PVC_NAMESPACES_BY_USED]: `sum by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes{namespace='${namespace}'} * on (namespace, persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(.*ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"}))`,
    [StorageDashboardQuery.PVC_NAMESPACES_TOTAL_USED]: `sum(sum by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes{namespace='${namespace}'} * on (namespace, persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(.*ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"})))`,
  };
  return queries;
};

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const getPoolQuery = (
  poolNames: string[],
  queryName: StorageDashboardQuery,
  managedByOCS: string
) => {
  const names = poolNames.join('|');
  const queries = {
    [StorageDashboardQuery.POOL_RAW_CAPACITY_USED]: `ceph_pool_bytes_used{managedBy='${managedByOCS}'} * on (pool_id) group_left(name)ceph_pool_metadata{name=~'${names}',managedBy='${managedByOCS}'}`,
    [StorageDashboardQuery.POOL_MAX_CAPACITY_AVAILABLE]: `ceph_pool_avail_raw{managedBy='${managedByOCS}'} * on (pool_id) group_left(name)ceph_pool_metadata{name=~'${names}',managedBy='${managedByOCS}'}`,
    [StorageDashboardQuery.POOL_UTILIZATION_IOPS_QUERY]: `(rate(ceph_pool_wr{managedBy='${managedByOCS}'}[1m]) + rate(ceph_pool_rd{managedBy='${managedByOCS}'}[1m])) * on (pool_id) group_left(name)ceph_pool_metadata{name=~'${names}',managedBy='${managedByOCS}'}`,
    [StorageDashboardQuery.POOL_UTILIZATION_THROUGHPUT_QUERY]: `(rate(ceph_pool_wr_bytes{managedBy='${managedByOCS}'}[1m]) + rate(ceph_pool_rd_bytes{managedBy='${managedByOCS}'}[1m])) * on (pool_id) group_left(name)ceph_pool_metadata{name=~'${names}',managedBy='${managedByOCS}'}`,
    [StorageDashboardQuery.POOL_COMPRESSION_SAVINGS]: `(ceph_pool_compress_under_bytes{managedBy='${managedByOCS}'} - ceph_pool_compress_bytes_used{managedBy='${managedByOCS}'}) * on (pool_id) group_left(name)ceph_pool_metadata{name=~'${names}',managedBy='${managedByOCS}'}`,
    [StorageDashboardQuery.POOL_COMPRESSION_ELIGIBILITY]: `(((ceph_pool_compress_under_bytes{managedBy='${managedByOCS}'} > 0) / ceph_pool_stored_raw{managedBy='${managedByOCS}'}) * 100) * on (pool_id) group_left(name)ceph_pool_metadata{name=~'${names}',managedBy='${managedByOCS}'}`,
    [StorageDashboardQuery.POOL_COMPRESSION_RATIO]: `((ceph_pool_compress_under_bytes{managedBy='${managedByOCS}'} / ceph_pool_compress_bytes_used{managedBy='${managedByOCS}'} > 0) and on(pool_id) (((ceph_pool_compress_under_bytes{managedBy='${managedByOCS}'} > 0) / ceph_pool_stored_raw{managedBy='${managedByOCS}'}) * 100 > 0.5)) * on (pool_id) group_left(name)ceph_pool_metadata{name=~'${names}',managedBy='${managedByOCS}'}`,
  };
  return queries[queryName];
};

export const INDEPENDENT_UTILIZATION_QUERIES = (
  storageClassNamePrefix: string
) => ({
  [StorageDashboardQuery.REQUESTED_CAPACITY]: `sum((kube_persistentvolumeclaim_resource_requests_storage_bytes * on (namespace,persistentvolumeclaim) group_right() kube_pod_spec_volumes_persistentvolumeclaims_info) * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"}))`,
  [StorageDashboardQuery.USED_CAPACITY]: `sum((topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes) * on (namespace,persistentvolumeclaim) group_right() kube_pod_spec_volumes_persistentvolumeclaims_info) * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)",storageclass=~"${storageClassNamePrefix}.*"}))`,
});

export const breakdownIndependentQueryMap = (
  storageClassNamePrefix: string
): BreakdownCardQueryMap => ({
  [BreakdownCardFields.PROJECTS]: {
    model: ProjectModel,
    metric: 'namespace',
    queries: {
      [StorageDashboardQuery.PROJECTS_BY_USED]: `(topk(6,(${
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix)[
          StorageDashboardQuery.PROJECTS_BY_USED
        ]
      })))`,
      [StorageDashboardQuery.PROJECTS_TOTAL_USED]:
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix)[
          StorageDashboardQuery.PROJECTS_TOTAL_USED
        ],
    },
  },
  [BreakdownCardFields.STORAGE_CLASSES]: {
    model: StorageClassModel,
    metric: 'storageclass',
    queries: {
      [StorageDashboardQuery.STORAGE_CLASSES_BY_USED]: `(topk(6,(${
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix)[
          StorageDashboardQuery.STORAGE_CLASSES_BY_USED
        ]
      })))`,
      [StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED]:
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix)[
          StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED
        ],
    },
  },
  [BreakdownCardFields.PODS]: {
    model: PodModel,
    metric: 'pod',
    queries: {
      [StorageDashboardQuery.PODS_BY_USED]: `(topk(6,(${
        CEPH_CAPACITY_BREAKDOWN_QUERIES(storageClassNamePrefix)[
          StorageDashboardQuery.PODS_BY_USED
        ]
      })))`,
      [StorageDashboardQuery.PODS_TOTAL_USED]: CEPH_CAPACITY_BREAKDOWN_QUERIES(
        storageClassNamePrefix
      )[StorageDashboardQuery.PODS_TOTAL_USED],
    },
  },
});

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const CAPACITY_TREND_QUERIES = (
  managedByOCS: string,
  maxDays?: string
) => ({
  [StorageDashboardQuery.UTILIZATION_1D]: `sum(delta(ceph_cluster_total_used_raw_bytes{managedBy="${managedByOCS}"}[1d]))`,
  [StorageDashboardQuery.UTILIZATION_VECTOR]: `sum(delta(ceph_cluster_total_used_raw_bytes{managedBy="${managedByOCS}"}[${maxDays}]))`,
  [StorageDashboardQuery.UPTIME_DAYS]: `ceph_cluster_total_used_raw_bytes{managedBy="${managedByOCS}"}[${maxDays}]`,
  [StorageDashboardQuery.RAW_CAPACITY_AVAILABLE]: `ceph_cluster_total_bytes{managedBy="${managedByOCS}"} - ceph_cluster_total_used_raw_bytes{managedBy="${managedByOCS}"}`,
});
