import { StorageClassResourceKind } from '../types';

export const getProvisioner = (storageClass: StorageClassResourceKind) =>
  storageClass?.provisioner;
