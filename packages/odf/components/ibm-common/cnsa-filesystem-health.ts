import { FileSystemKind } from '@odf/core/types/scale';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import {
  isOngoingFilesystemReason,
  isTemporaryNSDError,
} from './lun-group-health';

const isCnsaFilesystemCreating = (fileSystem: FileSystemKind): boolean => {
  const successCondition = fileSystem.status?.conditions?.find(
    (c) => c.type === 'Success'
  );
  if (!successCondition) {
    return true;
  }
  if (isTemporaryNSDError(fileSystem)) {
    return true;
  }
  if (
    successCondition.status === 'False' &&
    isOngoingFilesystemReason(successCondition.reason)
  ) {
    return true;
  }
  return false;
};

const isCnsaFilesystemConnected = (fileSystem: FileSystemKind): boolean =>
  fileSystem.status?.conditions?.some(
    (condition) => condition.type === 'Success' && condition.status === 'True'
  );

/** Remote (CNSA) filesystem health (aligned with scale FileSystems view). */
export const getCnsaFilesystemHealth = (
  fileSystem: FileSystemKind
): HealthState => {
  if (isCnsaFilesystemCreating(fileSystem)) {
    return HealthState.LOADING;
  }
  if (isCnsaFilesystemConnected(fileSystem)) {
    return HealthState.OK;
  }
  const successCondition = fileSystem.status?.conditions?.find(
    (c) => c.type === 'Success'
  );
  if (successCondition?.status === 'False') {
    return HealthState.ERROR;
  }
  return HealthState.WARNING;
};
