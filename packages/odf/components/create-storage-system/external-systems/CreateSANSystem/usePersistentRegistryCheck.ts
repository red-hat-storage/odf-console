import {
  ImageRegistryConfigModel,
  UX_BACKEND_PROXY_ROOT_PATH,
} from '@odf/shared';
import { ImageRegistryConfigKind } from '@odf/shared/types';
import {
  consoleFetchJSON,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';

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

type RegistryConnectionResult = {
  ok: boolean;
  error: string;
};

export const testRegistryConnection = async (
  imageRegistryUrl: string,
  registryRepositoryName: string,
  secretKey: string,
  secretNamespace: string
): Promise<RegistryConnectionResult> => {
  const url = `${UX_BACKEND_PROXY_ROOT_PATH}/cnsa/registry-checks`;
  try {
    await consoleFetchJSON(url, 'POST', {
      body: JSON.stringify({
        imageRegistryUrl,
        registryRepositoryName,
        secretKey,
        secretNamespace,
      }),
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  return { ok: true, error: '' };
};
