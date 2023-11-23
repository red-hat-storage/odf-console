import {
  CLUSTER_ID,
  PROV_SECRET_NS,
  NODE_SECRET_NS,
  CONTROLLER_SECRET_NS,
  CEPH_NS_SESSION_STORAGE,
} from '@odf/ocs/constants';
import { StorageClass } from '@odf/shared/types';

export const addClusterParams = (sc: StorageClass): StorageClass => {
  const cephClusterNamespace = sessionStorage.getItem(CEPH_NS_SESSION_STORAGE);
  sessionStorage.removeItem(CEPH_NS_SESSION_STORAGE);
  sc.parameters = {
    ...sc.parameters,
    [CLUSTER_ID]: cephClusterNamespace,
    [PROV_SECRET_NS]: cephClusterNamespace,
    [NODE_SECRET_NS]: cephClusterNamespace,
    [CONTROLLER_SECRET_NS]: cephClusterNamespace,
  };

  return sc;
};

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

  return addClusterParams(sc);
};
