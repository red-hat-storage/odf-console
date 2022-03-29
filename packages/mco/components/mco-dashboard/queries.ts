export enum StorageDashboard {
    USED_CAPACITY_FILE_BLOCK = 'USED_CAP_FB',
    TOTAL_CAP_FILE_BLOCK = 'TOTAL_CAP_FB',
    HEALTH = 'HEALTH',
    SYSTEM_HEALTH = 'SYSTEM_HEALTH',
    CSV_STATUS = 'CSV_STATUS',
  }
  
  export const CAPACITY_QUERIES = {
    [StorageDashboard.TOTAL_CAP_FILE_BLOCK]:
      '(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy) group_right(storage_system) odf_system_raw_capacity_total_bytes',
    [StorageDashboard.USED_CAPACITY_FILE_BLOCK]:
      '(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy) group_right(storage_system) odf_system_raw_capacity_used_bytes',
  };
  
  export const STATUS_QUERIES = {
    [StorageDashboard.SYSTEM_HEALTH]: '(label_replace(odf_system_map{target_namespace="openshift-storage"} , "managedBy", "$1", "target_name", "(.*)"))  * on (namespace, managedBy) group_right(storage_system, target_kind) odf_system_health_status',
    [StorageDashboard.HEALTH]: 'odf_system_health_status',
    [StorageDashboard.CSV_STATUS]: 'csv_succeeded{exported_namespace="openshift-storage"}',
  };
