import { FileSystemKind } from '@odf/core/types/scale';
import { FileSystemModel } from '@odf/shared';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { filterScaleFileSystems } from '../components/ibm-common/utils';

const filesystemResource = {
  kind: referenceForModel(FileSystemModel),
  isList: true,
  namespaced: false,
};

const useIsRemoteClusterDeletable = (remoteClusterName: string): boolean => {
  const [filesystems, filesystemsLoaded, filesystemsError] =
    useK8sWatchResource<FileSystemKind[]>(filesystemResource);

  if (!remoteClusterName || !filesystemsLoaded || filesystemsError) {
    return false;
  }

  return (
    filterScaleFileSystems(filesystems ?? [], remoteClusterName).length === 0
  );
};

export default useIsRemoteClusterDeletable;
