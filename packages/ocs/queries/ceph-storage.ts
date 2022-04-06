import { StorageClassModel, PodModel, ProjectModel } from '@odf/shared/models';
import { PROJECTS, STORAGE_CLASSES, PODS } from '../constants';

export enum StorageDashboardQuery {
  PROJECTS_BY_USED = 'PROJECTS_BY_USED',
  RESILIENCY_PROGRESS = 'RESILIENCY_PROGRESS',
  PROJECTS_TOTAL_USED = 'PROJECTS_TOTAL_USED',
  CEPH_CAPACITY_USED = 'CEPH_CAPACITY_USED',
  STORAGE_CLASSES_TOTAL_USED = 'STORAGE_CLASSES_TOTAL_USED',
  STORAGE_CLASSES_BY_USED = 'STORAGE_CLASSES_BY_USED',
  PODS_BY_USED = 'PODS_BY_USED',
  PODS_TOTAL_USED = 'PODS_TOTAL_USED',
  CEPH_CAPACITY_TOTAL = 'CEPH_CAPACITY_TOATL',
  CEPH_CAPACITY_AVAILABLE = 'CEPH_CAPACITY_AVAILABLE',
}

export const DATA_RESILIENCY_QUERY = {
  [StorageDashboardQuery.RESILIENCY_PROGRESS]:
    '(ceph_pg_clean and ceph_pg_active)/ceph_pg_total',
};

export const CAPACITY_BREAKDOWN_QUERIES = {
  [StorageDashboardQuery.PROJECTS_TOTAL_USED]:
    'sum(sum(kubelet_volume_stats_used_bytes * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)"})) by (namespace))',
  [StorageDashboardQuery.PROJECTS_BY_USED]:
    'sum(kubelet_volume_stats_used_bytes * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)"})) by (namespace)',
  [StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED]:
    'sum(sum(kubelet_volume_stats_used_bytes * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)"})) by (storageclass, provisioner))',
  [StorageDashboardQuery.STORAGE_CLASSES_BY_USED]:
    'sum(kubelet_volume_stats_used_bytes * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)"})) by (storageclass, provisioner)',
  [StorageDashboardQuery.PODS_TOTAL_USED]:
    'sum (((max by(namespace,persistentvolumeclaim) (kubelet_volume_stats_used_bytes)) * on (namespace,persistentvolumeclaim) group_right() ((kube_running_pod_ready*0+1) * on(namespace, pod)  group_right() kube_pod_spec_volumes_persistentvolumeclaims_info)) * on(namespace,persistentvolumeclaim) group_left(provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)"}))',
  [StorageDashboardQuery.PODS_BY_USED]:
    'sum by(namespace,pod) (((max by(namespace,persistentvolumeclaim) (kubelet_volume_stats_used_bytes)) * on (namespace,persistentvolumeclaim) group_right() ((kube_running_pod_ready*0+1) * on(namespace, pod)  group_right() kube_pod_spec_volumes_persistentvolumeclaims_info)) * on(namespace,persistentvolumeclaim) group_left(provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(ceph.rook.io/block)"}))',
  [StorageDashboardQuery.CEPH_CAPACITY_TOTAL]: 'ceph_cluster_total_bytes',
  [StorageDashboardQuery.CEPH_CAPACITY_USED]:
    'sum(kubelet_volume_stats_used_bytes * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass)  group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)"}))',
  [StorageDashboardQuery.CEPH_CAPACITY_AVAILABLE]:
    'max(ceph_pool_max_avail * on (pool_id) group_left(name)ceph_pool_metadata{name=~"(.*file.*)|(.*block.*)"})',
};

export const breakdownQueryMap = {
  [PROJECTS]: {
    model: ProjectModel,
    metric: 'namespace',
    queries: {
      [StorageDashboardQuery.PROJECTS_BY_USED]: `(topk(6,(${
        CAPACITY_BREAKDOWN_QUERIES[StorageDashboardQuery.PROJECTS_BY_USED]
      })))`,
      [StorageDashboardQuery.PROJECTS_TOTAL_USED]:
        CAPACITY_BREAKDOWN_QUERIES[StorageDashboardQuery.PROJECTS_TOTAL_USED],
      [StorageDashboardQuery.CEPH_CAPACITY_USED]:
        CAPACITY_BREAKDOWN_QUERIES[StorageDashboardQuery.CEPH_CAPACITY_USED],
    },
  },
  [STORAGE_CLASSES]: {
    model: StorageClassModel,
    metric: 'storageclass',
    queries: {
      [StorageDashboardQuery.STORAGE_CLASSES_BY_USED]: `(topk(6,(${
        CAPACITY_BREAKDOWN_QUERIES[
          StorageDashboardQuery.STORAGE_CLASSES_BY_USED
        ]
      })))`,
      [StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED]:
        CAPACITY_BREAKDOWN_QUERIES[
          StorageDashboardQuery.STORAGE_CLASSES_TOTAL_USED
        ],
      [StorageDashboardQuery.CEPH_CAPACITY_USED]:
        CAPACITY_BREAKDOWN_QUERIES[StorageDashboardQuery.CEPH_CAPACITY_USED],
    },
  },
  [PODS]: {
    model: PodModel,
    metric: 'pod',
    queries: {
      [StorageDashboardQuery.PODS_BY_USED]: `(topk(6,(${
        CAPACITY_BREAKDOWN_QUERIES[StorageDashboardQuery.PODS_BY_USED]
      })))`,
      [StorageDashboardQuery.PODS_TOTAL_USED]:
        CAPACITY_BREAKDOWN_QUERIES[StorageDashboardQuery.PODS_TOTAL_USED],
      [StorageDashboardQuery.CEPH_CAPACITY_USED]:
        CAPACITY_BREAKDOWN_QUERIES[StorageDashboardQuery.CEPH_CAPACITY_USED],
    },
  },
};
