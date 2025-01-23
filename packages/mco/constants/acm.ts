import { TFunction } from 'react-i18next';

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
export enum DRApplication {
  APPSET = 'ApplicationSet',
  SUBSCRIPTION = 'Subscription',
  DISCOVERED = 'Discovered',
}
// Display texts
export const APPLICATION_TYPE_DISPLAY_TEXT = (
  t: TFunction
): { [key in DRApplication]: string } => ({
  [DRApplication.APPSET]: t('ApplicationSet'),
  [DRApplication.SUBSCRIPTION]: t('Subscription'),
  [DRApplication.DISCOVERED]: t('Discovered'),
});

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

// Managed cluster cluster id label key
export const CLUSTER_ID = 'clusterID';
