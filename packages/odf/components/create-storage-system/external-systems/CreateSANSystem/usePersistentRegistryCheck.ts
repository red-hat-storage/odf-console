import * as React from 'react';
import { ImageRegistryConfigModel } from '@odf/shared';
import { ImageRegistryConfigKind } from '@odf/shared/types';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

export const usePersistentRegistryCheck = () => {
  const [config, loaded, error] = useK8sWatchResource<ImageRegistryConfigKind>({
    groupVersionKind: {
      group: ImageRegistryConfigModel.apiGroup,
      version: ImageRegistryConfigModel.apiVersion,
      kind: ImageRegistryConfigModel.kind,
    },
    isList: false,
    name: 'cluster',
  });

  const hasPersistentRegistry = React.useMemo(() => {
    if (!loaded || error || !config) {
      return false;
    }

    if (config.spec?.managementState !== 'Managed') {
      return false;
    }

    if (
      config.status?.storage?.managementState &&
      config.status.storage.managementState !== 'Managed'
    ) {
      return false;
    }

    const specStorage = config.spec?.storage;
    const statusStorage = config.status?.storage;

    if (specStorage?.emptyDir || statusStorage?.emptyDir) {
      return false;
    }

    const hasPersistentBackend = !!(
      specStorage?.pvc ||
      specStorage?.s3 ||
      specStorage?.gcs ||
      specStorage?.azure ||
      specStorage?.swift ||
      specStorage?.ibmcos ||
      specStorage?.oss
    );

    return hasPersistentBackend;
  }, [config, loaded, error]);

  return [hasPersistentRegistry, loaded, error];
};
