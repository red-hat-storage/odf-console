import {
  BLUESTORE,
  BLUESTORE_RDR,
  OSDMigrationStatus,
} from '@odf/core/constants';
import { CephClusterKind } from '@odf/shared/types';

export function getCephStoreType(ceph: CephClusterKind) {
  return ceph?.status?.storage?.osd?.storeType;
}

export const getBluestoreCount = (ceph: CephClusterKind): number => {
  return getCephStoreType(ceph)?.[BLUESTORE] || 0;
};

export const getBluestoreRdrCount = (ceph: CephClusterKind): number => {
  return getCephStoreType(ceph)?.[BLUESTORE_RDR] || 0;
};

export const getOSDMigrationMetrics = (ceph: CephClusterKind) => {
  const blueStoreCount = getBluestoreCount(ceph);
  const blueStoreRdrCount = getBluestoreRdrCount(ceph);
  const totalOSDCount = blueStoreCount + blueStoreRdrCount;
  const percentageComplete =
    totalOSDCount !== 0
      ? Math.round((blueStoreRdrCount / totalOSDCount) * 100)
      : 0;
  return {
    blueStoreCount,
    blueStoreRdrCount,
    totalOSDCount,
    percentageComplete,
  };
};

export const getOSDMigrationStatus = (ceph: CephClusterKind) => {
  if (!!ceph) {
    const bluestoreCount = getBluestoreCount(ceph);
    const bluestoreRdrCount = getBluestoreRdrCount(ceph);

    if (bluestoreCount > 0) {
      if (bluestoreRdrCount > 0) {
        return OSDMigrationStatus.IN_PROGRESS;
      } else {
        return OSDMigrationStatus.PENDING;
      }
    } else if (bluestoreRdrCount > 0) {
      return OSDMigrationStatus.COMPLETED;
    }
  } else {
    return OSDMigrationStatus.FAILED;
  } // TODO Add condition for migration failure
};
