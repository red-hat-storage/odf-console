import {
  CLUSTER_ID,
  PROV_SECRET_NS,
  NODE_SECRET_NS,
  CONTROLLER_SECRET_NS,
  CEPH_NS_SESSION_STORAGE,
} from '@odf/ocs/constants';
import { getAnnotations } from '@odf/shared/selectors';
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

const isEncryptedStorageClass = (sc: StorageClass): boolean => {
  return (
    sc?.parameters?.hasOwnProperty('encrypted') &&
    sc?.parameters?.['encrypted'] === 'true'
  );
};

export const addKubevirtAnnotations = (sc: StorageClass): StorageClass => {
  if (isEncryptedStorageClass(sc)) {
    sc.metadata.annotations = {
      ...sc.metadata?.annotations,
      'cdi.kubevirt.io/clone-strategy': 'copy',
    };
  }

  return addClusterParams(sc);
};

export const addKeyRotationAnnotation = (sc: StorageClass): StorageClass => {
  if (isEncryptedStorageClass(sc)) {
    sc.metadata.annotations = {
      ...getAnnotations(sc, {}),
      'keyrotation.csiaddons.openshift.io/schedule': '@weekly',
    };
  }
  return sc;
};

export const addReclaimSpaceAnnotation = (sc: StorageClass): StorageClass => {
  sc.metadata.annotations = {
    ...getAnnotations(sc, {}),
    'reclaimspace.csiaddons.openshift.io/schedule': '@weekly',
  };
  return sc;
};

export const addRBDAnnotations = (sc: StorageClass): StorageClass => {
  sc = addKubevirtAnnotations(sc);
  sc = addReclaimSpaceAnnotation(sc);
  sc = addKeyRotationAnnotation(sc);
  return sc;
};
