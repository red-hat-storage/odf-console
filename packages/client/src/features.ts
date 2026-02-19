import * as React from 'react';
import { NOOBAA_PROVISIONER } from '@odf/core/constants';
import { StorageClassModel } from '@odf/shared/models';
import { StorageClassResourceKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import {
  SetFeatureFlag,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';

export { default } from '@odf/core/redux';
export * from '@odf/core/redux';

export const NOOBAA_SC_FLAG = 'NOOBAA_SC';

export const useNoobaaStorageClassFlag = (setFlag: SetFeatureFlag): void => {
  const [storageClasses, loaded, loadError] = useK8sWatchResource<
    StorageClassResourceKind[]
  >({
    kind: referenceForModel(StorageClassModel),
    isList: true,
  });

  React.useEffect(() => {
    if (loaded && !loadError) {
      const hasNoobaa = storageClasses?.some((sc) =>
        sc?.provisioner?.endsWith(NOOBAA_PROVISIONER)
      );
      setFlag(NOOBAA_SC_FLAG, !!hasNoobaa);
      return;
    }
    if (loadError) {
      setFlag(NOOBAA_SC_FLAG, false);
    }
  }, [loaded, loadError, setFlag, storageClasses]);
};
