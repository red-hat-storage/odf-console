import { StorageClass } from '@odf/shared/types';

export const addKubevirtAnnotations = (sc: StorageClass): StorageClass => {
  if (
    sc?.parameters?.hasOwnProperty('encrypted') &&
    sc?.parameters?.['encrypted'] === 'true'
  ) {
    sc.metadata.annotations = {
      ...sc.metadata?.annotations,
      'cdi.kubevirt.io/clone-strategy': 'copy',
    };
  }
  return sc;
};
