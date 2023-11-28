import { STORAGE_TYPE } from '../constants';

export type ODFConfigKind = {
  // ODF operator version.
  ODFVersion: string;
  // Type of storage internal/external
  type: STORAGE_TYPE;
  // Namespaced storage cluster name.
  storageCluster: string;
  // Namespaced storage system name.
  storageSystem: string;
  // Ceph FSID to determine RDR/MDR.
  cephFSID: string;
};
