export const checkRequiredValues = (
  poolName: string,
  replicaSize: string,
  lsoStorageClassName: string,
  storageClassName: string,
  enableStorageClassEncryption: boolean,
  encryptionKMSID: string
): boolean =>
  !poolName ||
  !replicaSize ||
  !lsoStorageClassName ||
  !storageClassName ||
  (enableStorageClassEncryption ? !encryptionKMSID : false);
