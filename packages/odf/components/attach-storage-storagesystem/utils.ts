import { AttachStorageFormState } from './state';

export const checkRequiredValues = (
  poolName: string,
  replicaSize: string,
  lsoStorageClassName: string,
  storageClassName: string,
  enableStorageClassEncryption: boolean,
  encryptionKMSID: string,
  deviceClass: string,
  state?: AttachStorageFormState
): boolean => {
  const dataProtectionValid = !state
    ? !!replicaSize
    : state.dataProtectionPolicy === 'erasure-coding'
      ? !!state.erasureCodingSchema
      : !!replicaSize;
  return (
    !poolName ||
    !dataProtectionValid ||
    !lsoStorageClassName ||
    !storageClassName ||
    !deviceClass ||
    (enableStorageClassEncryption ? !encryptionKMSID : false)
  );
};
