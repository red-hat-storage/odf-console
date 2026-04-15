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

  let hasPersistentRegistry = false;
  if (loaded && !error) {
    const specStorage = config.spec?.storage;
    const statusStorage = config.status?.storage;
    if (!specStorage?.emptyDir && !statusStorage?.emptyDir) {
      hasPersistentRegistry = !!(
        specStorage?.pvc ||
        specStorage?.s3 ||
        specStorage?.gcs ||
        specStorage?.azure ||
        specStorage?.swift ||
        specStorage?.ibmcos ||
        specStorage?.oss
      );
    }
  }

  return [hasPersistentRegistry, loaded, error];
};
