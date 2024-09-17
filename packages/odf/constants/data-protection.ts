export const DISASTER_RECOVERY_TARGET_ANNOTATION =
  'ocs.openshift.io/clusterIsDisasterRecoveryTarget';

// "~1" is used to represent a "/", else any "patch" call will treat prefix as a path
export const DISASTER_RECOVERY_TARGET_ANNOTATION_WO_SLASH =
  'ocs.openshift.io~1clusterIsDisasterRecoveryTarget';

export enum OSDMigrationStatus {
  IN_PROGRESS = 'In Progress',
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

export const BLUESTORE_RDR = 'bluestore-rdr';
export const BLUESTORE = 'bluestore';
