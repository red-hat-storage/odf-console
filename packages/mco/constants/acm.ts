import { TFunction } from 'i18next';

// Managed cluster region claim
export const MANAGED_CLUSTER_REGION_CLAIM = 'region.open-cluster-management.io';
// Managed cluster OCP public URL claim
export const CLUSTER_CLAIM_URL_NAME =
  'consoleurl.cluster.open-cluster-management.io';

// Ramen schedulers
export const DR_SECHEDULER_NAME = 'ramen';
export const PROTECTED_APP_ANNOTATION =
  'cluster.open-cluster-management.io/experimental-scheduling-disable';
// "~1" is used to represent a "/", else any "patch" call will treat prefix as a path
export const PROTECTED_APP_ANNOTATION_WO_SLASH =
  'cluster.open-cluster-management.io~1experimental-scheduling-disable';

// Placement label
export const PLACEMENT_REF_LABEL =
  'cluster.open-cluster-management.io/placement';

export const PLACEMENT_RULE_REF_LABEL =
  'cluster.open-cluster-management.io/placementrule';

// Application types supported for DR
export enum APPLICATION_TYPE {
  APPSET = 'ApplicationSet',
  SUBSCRIPTION = 'Subscription',
  DISCOVERED = 'Discovered',
}
// Display texts
export const APPLICATION_TYPE_DISPLAY_TEXT = (
  t: TFunction
): { [key in APPLICATION_TYPE]: string } => ({
  [APPLICATION_TYPE.APPSET]: t('ApplicationSet'),
  [APPLICATION_TYPE.SUBSCRIPTION]: t('Subscription'),
  [APPLICATION_TYPE.DISCOVERED]: t('Discovered'),
});

// Please refer to clusterclaims.go in github.com/red-hat-storage/ocs-operator before changing anything here
export enum ClusterClaimTypes {
  ODF_VERSION = 'version.odf.openshift.io',
  STORAGE_CLUSTER_NAME = 'storageclustername.odf.openshift.io',
  STORAGE_SYSTEM_NAME = 'storagesystemname.odf.openshift.io',
  CEPH_FSID = 'cephfsid.odf.openshift.io',
  STORAGE_CLUSTER_COUNT = 'count.storagecluster.odf.openshift.io',
}

// Managed cluster status conditions
export const MANAGED_CLUSTER_CONDITION_AVAILABLE =
  'ManagedClusterConditionAvailable';
export const MANAGED_CLUSTER_JOINED = 'ManagedClusterJoined';

// Search result labels
export const LABEL = 'label';
export const LABELS_SPLIT_CHAR = '; ';
export const LABEL_SPLIT_CHAR = '=';
export const DR_BLOCK_LISTED_LABELS = ['app.kubernetes.io/instance'];

export const ACM_OPERATOR_SPEC_NAME = 'advanced-cluster-management';
