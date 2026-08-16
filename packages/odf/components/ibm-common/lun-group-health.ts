import { FileSystemKind } from '@odf/core/types/scale';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

/** Stuck LUN group creation is treated as error after this (same as LUNCard). */
export const LUN_GROUP_CREATION_TIMEOUT_MS = 5 * 60 * 1000;

export const ONGOING_FILESYSTEM_REASONS = [
  'FilesystemNotEstablished',
  'LocalDiskNotReady',
  'LocalDiskWrongType',
] as const;

export const isOngoingFilesystemReason = (reason?: string): boolean =>
  ONGOING_FILESYSTEM_REASONS.includes(
    reason as (typeof ONGOING_FILESYSTEM_REASONS)[number]
  );

export const isTemporaryNSDError = (fileSystem: FileSystemKind): boolean => {
  const successCondition = fileSystem.status?.conditions?.find(
    (c) => c.type === 'Success'
  );
  return (
    successCondition?.status === 'False' &&
    successCondition?.reason === 'Failed' &&
    successCondition?.message?.includes('NSD')
  );
};

export const isLunGroupConnected = (fileSystem: FileSystemKind): boolean => {
  const conditions = fileSystem.status?.conditions || [];
  const successCondition = conditions.find((c) => c.type === 'Success');
  const mountedCondition = conditions.find((c) => c.type === 'Mounted');

  return (
    successCondition?.status === 'True' && mountedCondition?.status === 'True'
  );
};

export const isLunGroupCreating = (fileSystem: FileSystemKind): boolean => {
  const conditions = fileSystem.status?.conditions || [];
  const successCondition = conditions.find((c) => c.type === 'Success');
  const mountedCondition = conditions.find((c) => c.type === 'Mounted');

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

  if (
    successCondition.status === 'True' &&
    mountedCondition?.status !== 'True'
  ) {
    return true;
  }

  return false;
};

export const getLUNGroupStatus = (fileSystem: FileSystemKind): HealthState => {
  if (isLunGroupConnected(fileSystem)) {
    return HealthState.OK;
  }
  if (_.isEmpty(fileSystem.status)) {
    return HealthState.UNKNOWN;
  }
  if (isLunGroupCreating(fileSystem)) {
    const creationTimestamp = fileSystem.metadata?.creationTimestamp;
    if (creationTimestamp) {
      const createdAt = new Date(creationTimestamp).getTime();
      if (Date.now() - createdAt > LUN_GROUP_CREATION_TIMEOUT_MS) {
        return HealthState.ERROR;
      }
    }
    return HealthState.LOADING;
  }
  return HealthState.ERROR;
};
