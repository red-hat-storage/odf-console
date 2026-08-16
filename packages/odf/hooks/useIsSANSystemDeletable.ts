import { FileSystemModel } from '@odf/shared';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { filterSANFileSystems } from '../components/ibm-common/utils';
import { FileSystemKind } from '../types/scale';

const filesystemResource = {
  kind: referenceForModel(FileSystemModel),
  isList: true,
  namespaced: false,
};

const useIsSANSystemDeletable = (): boolean => {
  const [filesystems, filesystemsLoaded, filesystemsError] =
    useK8sWatchResource<FileSystemKind[]>(filesystemResource);

  if (!filesystemsLoaded || filesystemsError) {
    return false;
  }

  return filterSANFileSystems(filesystems ?? []).length === 0;
};

export default useIsSANSystemDeletable;
