import {
  TOTAL_CAPACITY_FILE_BLOCK_METRIC,
  USED_CAPACITY_FILE_BLOCK_METRIC,
  SYSTEM_HEALTH_METRIC,
} from '@odf/shared/queries';

export enum StorageDashboard {
  USED_CAPACITY_FILE_BLOCK = 'USED_CAPACITY_FILE_BLOCK',
  TOTAL_CAPACITY_FILE_BLOCK = 'TOTAL_CAPACITY_FILE_BLOCK',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  CSV_STATUS = 'CSV_STATUS',
  CSV_STATUS_ALL_WHITELISTED = 'CSV_STATUS_ALL_WHITELISTED',
  HEALTH = 'HEALTH',
}

// "recording_rules" added in "observability-metrics-custom-allowlist" ConfigMap
export const TOTAL_PVC_COUNT_QUERY = 'count_persistentvolumeclaim_total';

/** FIX THIS */
export const PVC_SLA_QUERY = 'dr_pvc_sla';
export const getPvcSlaPerClusterQuery = (clusterName: string) =>
  `${PVC_SLA_QUERY}{cluster=~'${clusterName}'}`;
export const getPvcSlaPerPVCQuery = (
  clusterName: string,
  remoteNS: string,
  pvcName: string
) =>
  `${PVC_SLA_QUERY}{cluster=~'${clusterName}',pvc_namespace=~'${remoteNS}',pvc_name=~'${pvcName}'}`;

export const CAPACITY_QUERIES = {
  [StorageDashboard.TOTAL_CAPACITY_FILE_BLOCK]: `(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system) ${TOTAL_CAPACITY_FILE_BLOCK_METRIC}`,
  [StorageDashboard.USED_CAPACITY_FILE_BLOCK]: `(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system) ${USED_CAPACITY_FILE_BLOCK_METRIC}`,
};

export const STATUS_QUERIES = {
  [StorageDashboard.SYSTEM_HEALTH]: `(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy, cluster) group_right(storage_system, target_kind) ${SYSTEM_HEALTH_METRIC}`,
  [StorageDashboard.HEALTH]: SYSTEM_HEALTH_METRIC,
  [StorageDashboard.CSV_STATUS]:
    'csv_succeeded{exported_namespace="openshift-storage"}',
  [StorageDashboard.CSV_STATUS_ALL_WHITELISTED]: 'csv_succeeded',
};
