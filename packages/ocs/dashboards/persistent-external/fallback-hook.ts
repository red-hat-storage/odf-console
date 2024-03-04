import { StorageClassModel } from '@odf/shared/models';
import { StorageClassResourceKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import {
  WatchK8sResource,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';

const scResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(StorageClassModel),
};

const fsProvisionerPostFix = '.cephfs.csi.ceph.com';

/**
 * This hooks is for ODF Client Mode use case only.
 * ODF client mode doesn't deploy ODF StorageCluster hence falling back to StorageClases.
 */
const useClientFallback = (storageClusterName) => {
  const [storageClasses, storageClassesLoaded, storageClassLoadError] =
    useK8sWatchResource<StorageClassResourceKind[]>(scResource);
  if (storageClusterName) {
    return storageClusterName;
  }

  const provisioners = storageClasses.map((sc) => sc.provisioner);
  const fileSystemProvisioner = provisioners.find((item) =>
    item.includes(fsProvisionerPostFix)
  );
  const clusterName = fileSystemProvisioner?.split(fsProvisionerPostFix)?.[0];
  return storageClassesLoaded && !storageClassLoadError
    ? clusterName
    : 'ocs-storagecluster';
};

export default useClientFallback;
