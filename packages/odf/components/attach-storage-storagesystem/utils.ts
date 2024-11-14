export const checkRequiredValues = (
  poolName: string,
  replicaSize: string,
  lsoStorageClassName: string,
  storageClassName: string
): boolean =>
  !poolName || !replicaSize || !lsoStorageClassName || !storageClassName;
