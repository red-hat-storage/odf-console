import { ApplicationType } from '@odf/mco/constants/acm';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import { ArgoApplicationSetModel, useK8sGet } from '@odf/shared';
import { ApplicationModel } from '@odf/shared/models';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export const useApplicationFromPAV = (pav: ProtectedApplicationViewKind) => {
  const appInfo = pav.status?.applicationInfo;
  const appRef = appInfo?.applicationRef;

  const model =
    appInfo?.type === ApplicationType.ApplicationSet
      ? ArgoApplicationSetModel
      : ApplicationModel;

  const [application, loaded, error] = useK8sGet<K8sResourceCommon>(
    appRef?.name ? model : null,
    appRef?.name,
    appRef?.namespace
  );

  return { application, loaded, error, appInfo };
};
