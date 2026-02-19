import { isClientPlugin } from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { PROVIDER_MODE } from '../features';

export const useIsClientCluster = (): [boolean, boolean] => {
  const isClientBuild = isClientPlugin();
  const isProviderMode = useFlag(PROVIDER_MODE);

  if (isClientBuild) {
    return [true, true];
  }

  if (isProviderMode === undefined) {
    return [false, false];
  }

  return [!isProviderMode, true];
};
