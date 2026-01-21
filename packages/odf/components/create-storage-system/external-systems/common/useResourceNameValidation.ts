import * as React from 'react';
import { FileSystemKind } from '@odf/core/types/scale';
import { FileSystemModel } from '@odf/shared/models/scale';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

/**
 * Hook to watch FileSystem resources and return existing names
 * Used for validating unique resource names (LUN groups, filesystems, etc.)
 */
export const useExistingFileSystemNames = () => {
  const [fileSystems, fileSystemsLoaded] = useK8sWatchResource<
    FileSystemKind[]
  >({
    groupVersionKind: {
      group: FileSystemModel.apiGroup,
      version: FileSystemModel.apiVersion,
      kind: FileSystemModel.kind,
    },
    isList: true,
  });

  const existingFileSystemNames = React.useMemo(() => {
    if (!fileSystemsLoaded || !fileSystems) return new Set<string>();
    return new Set(fileSystems.map((fs) => fs.metadata?.name).filter(Boolean));
  }, [fileSystems, fileSystemsLoaded]);

  return existingFileSystemNames;
};

/**
 * Creates a Yup test function for uniqueness validation
 */
export const createUniquenessValidator = (existingNames?: Set<string>) => {
  return (value: string | undefined) => {
    if (!value || !existingNames) return true;
    return !existingNames.has(value);
  };
};
