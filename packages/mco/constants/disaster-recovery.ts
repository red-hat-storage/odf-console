import { TFunction } from 'react-i18next';

// VRG annotations
export const DRPC_NAME_ANNOTATION =
  'drplacementcontrol.ramendr.openshift.io/drpc-name';
export const DRPC_NAMESPACE_ANNOTATION =
  'drplacementcontrol.ramendr.openshift.io/drpc-namespace';

// DRPC annotations
export const LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION =
  'drplacementcontrol.ramendr.openshift.io/last-app-deployment-cluster';
// ACM managed application workload namespace
export const APP_NAMESPACE_ANNOTATION =
  'drplacementcontrol.ramendr.openshift.io/app-namespace';
export const DO_NOT_DELETE_PVC_ANNOTATION_WO_SLASH =
  'drplacementcontrol.ramendr.openshift.io~1do-not-delete-pvc';
export const IS_CG_ENABLED_ANNOTATION =
  'drplacementcontrol.ramendr.openshift.io/is-cg-enabled';

// Maximum cluster per DRPolicy
export const MAX_ALLOWED_CLUSTERS = 2;

// DRPolicy actions
export const Actions = {
  DELETE_DR_POLICY: 'Delete DRPolicy',
};

// This label enables the flatten image feature
export const RBD_IMAGE_FLATTEN_LABEL = {
  'replication.storage.openshift.io/flatten-mode': 'force',
};

// This label tells us the consistency group name of a pvc
export const CONSISTENCY_GROUP_LABEL = 'ramendr.openshift.io/consistency-group';

// DR actions
export enum DRActionType {
  FAILOVER = 'Failover',
  RELOCATE = 'Relocate',
}

// Regional / Metro DR
export enum ReplicationType {
  ASYNC = 'async',
  SYNC = 'sync',
}

// DR cluster type
export enum DRReplicationState {
  PrimaryState = 'Primary',
  SecondaryState = 'Secondary',
  UnknownState = 'Unknown',
}

// DR protection status (UI-only, derived from conditions)
export enum DRProtectionStatus {
  Protecting = 'Protecting',
  ProtectionError = 'ProtectionError',
}

// DRPolicy sync interval unit
export enum TimeUnits {
  Minutes = 'm',
  Hours = 'h',
  Days = 'd',
}

// Display texts
export const REPLICATION_DISPLAY_TEXT = (
  t: TFunction
): { [key in ReplicationType]: string } => ({
  async: t('Asynchronous'),
  sync: t('Synchronous'),
});

export const SYNC_SCHEDULE_DISPLAY_TEXT = (
  t: TFunction
): { [key in TimeUnits]: string } => ({
  [TimeUnits.Minutes]: t('minutes'),
  [TimeUnits.Hours]: t('hours'),
  [TimeUnits.Days]: t('days'),
});

// Asisgn policy wizard steps
export enum AssignPolicySteps {
  Policy = 'policy',
  PersistentVolumeClaim = 'persistent-volume-claim',
  ReviewAndAssign = 'review-and-assign',
  ProtectionType = 'protection-type',
  Replication = 'replication',
}
export const AssignPolicyStepsNames = (t: TFunction) => ({
  [AssignPolicySteps.Policy]: t('Policy'),
  [AssignPolicySteps.PersistentVolumeClaim]: t('PersistentVolumeClaim'),
  [AssignPolicySteps.ReviewAndAssign]: t('Review and assign'),
  [AssignPolicySteps.ProtectionType]: t('Protection type'),
  [AssignPolicySteps.Replication]: t('Replication'),
});

export const ENROLLED_APP_QUERY_PARAMS_KEY = 'enrolledApp';

// Enroll discovered application wizard steps
export enum EnrollDiscoveredApplicationSteps {
  Namespace = 'namespace',
  Configuration = 'Configuration',
  Replication = 'replication',
  Review = 'review',
}
export const EnrollDiscoveredApplicationStepNames = (t: TFunction) => ({
  [EnrollDiscoveredApplicationSteps.Namespace]: t('Namespace'),
  [EnrollDiscoveredApplicationSteps.Configuration]: t('Configuration'),
  [EnrollDiscoveredApplicationSteps.Replication]: t('Replication'),
  [EnrollDiscoveredApplicationSteps.Review]: t('Review'),
});

export const MCV_NAME_TEMPLATE = 'odf-multicluster-mcv-';

export const MCO_CREATED_BY_LABEL_KEY =
  'multicluster.odf.openshift.io/created-by';
export const MCO_CREATED_BY_MC_CONTROLLER =
  'odf-multicluster-managedcluster-controller';

// Recipe parameter keys
export const VM_RECIPE_NAME = 'vm-recipe';
export const K8S_RESOURCE_SELECTOR = 'K8S_RESOURCE_SELECTOR';
export const PVC_RESOURCE_SELECTOR = 'PVC_RESOURCE_SELECTOR';
export const PROTECTED_VMS = 'PROTECTED_VMS';
export const K8S_RESOURCE_SELECTOR_LABEL_KEY =
  'ramendr.openshift.io/k8s-resource-selector';
export const STORAGE_ID_LABEL_KEY = 'ramendr.openshift.io/storageid';

export enum BackendType {
  DataFoundation = 'Data Foundation',
  ThirdParty = 'Third Party Storage',
}
