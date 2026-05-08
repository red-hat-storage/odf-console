import { FileSystemKind } from '@odf/core/types/scale';
import * as _ from 'lodash-es';

export const filterScaleFileSystems = (
  fileSystems: FileSystemKind[],
  remoteFileSystemName: string
): FileSystemKind[] => {
  return fileSystems.filter(
    (fs) =>
      fs.spec.remote &&
      !_.isEmpty(fs.spec.remote) &&
      fs.spec.remote.cluster === remoteFileSystemName
  );
};

export const filterSANFileSystems = (
  fileSystems: FileSystemKind[]
): FileSystemKind[] => {
  return fileSystems.filter((fs) => fs.spec.local && _.isEmpty(fs.spec.remote));
};
