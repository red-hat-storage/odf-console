import { ConfigMapKind } from '@odf/shared/types';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  getIBMStorageScaleInfoConfigMapResourceObj,
  getODFClientInfoConfigMapResourceObj,
} from './mco-resources';

export type StorageProviderInfo = {
  odfClientInfoCM: ConfigMapKind | undefined;
  scaleCM: ConfigMapKind | undefined;
  loaded: boolean;
};

/** Each provider announces its clusters in its own info map; a missing or unreadable map only means that provider is absent. */
export const useStorageProviderInfo = (): StorageProviderInfo => {
  const [odfClientInfoCM, odfLoaded, odfLoadError] =
    useK8sWatchResource<ConfigMapKind>(getODFClientInfoConfigMapResourceObj());
  const [scaleCM, scaleLoaded, scaleLoadError] =
    useK8sWatchResource<ConfigMapKind>(
      getIBMStorageScaleInfoConfigMapResourceObj()
    );

  return {
    odfClientInfoCM: odfLoaded ? odfClientInfoCM : undefined,
    scaleCM: scaleLoaded ? scaleCM : undefined,
    // The Console never marks a watch on a missing object as loaded, so an error also counts as settled.
    loaded: (odfLoaded || !!odfLoadError) && (scaleLoaded || !!scaleLoadError),
  };
};
