import { TFunction } from 'i18next';

// VRG annotations
export const DRPC_NAME_ANNOTATION =
  'drplacementcontrol.ramendr.openshift.io/drpc-name';
export const DRPC_NAMESPACE_ANNOTATION =
  'drplacementcontrol.ramendr.openshift.io/drpc-namespace';

// DRPC annotations
export const LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION =
  'drplacementcontrol.ramendr.openshift.io/last-app-deployment-cluster';

// Maximum cluster per DRPolicy
export const MAX_ALLOWED_CLUSTERS = 2;

// DRPolicy actions
export const Actions = {
  DELETE_DR_POLICY: 'Delete DRPolicy',
};

// DR actions
export enum DRActionType {
  FAILOVER = 'Failover',
  RELOCATE = 'Relocate',
}

// Regional / Metro DR
export enum REPLICATION_TYPE {
  ASYNC = 'async',
  SYNC = 'sync',
}

// DR status
export enum DRPC_STATUS {
  FailedOver = 'FailedOver',
  Relocating = 'Relocating',
  FailingOver = 'FailingOver',
  Relocated = 'Relocated',
}

// DR cluster type
export enum DR_REPLICATION_STATE {
  PrimaryState = 'Primary',
  SecondaryState = 'Secondary',
  UnknownState = 'Unknown',
}

// DRPolicy sync interval unit
export enum TIME_UNITS {
  Minutes = 'm',
  Hours = 'h',
  Days = 'd',
}

// Display texts
export const REPLICATION_DISPLAY_TEXT = (
  t: TFunction
): { [key in REPLICATION_TYPE]: string } => ({
  async: t('Asynchronous'),
  sync: t('Synchronous'),
});

export const SYNC_SCHEDULE_DISPLAY_TEXT = (
  t: TFunction
): { [key in TIME_UNITS]: string } => ({
  [TIME_UNITS.Minutes]: t('minutes'),
  [TIME_UNITS.Hours]: t('hours'),
  [TIME_UNITS.Days]: t('days'),
});

// Asisgn policy wizard steps
export enum AssignPolicySteps {
  Policy = 'policy',
  PersistentVolumeClaim = 'persistent-volume-claim',
  ReviewAndAssign = 'review-and-assign',
  PolicyRule = 'policy-rule',
  DynamicObjects = 'dynamic-objects',
}
export const AssignPolicyStepsNames = (t: TFunction) => ({
  [AssignPolicySteps.Policy]: t('Policy'),
  [AssignPolicySteps.PersistentVolumeClaim]: t('PersistentVolumeClaim'),
  [AssignPolicySteps.ReviewAndAssign]: t('Review and assign'),
  [AssignPolicySteps.PolicyRule]: t('Policy rule'),
  [AssignPolicySteps.DynamicObjects]: t('Dynamic objects'),
});
