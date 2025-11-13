import { SecretModel } from '@odf/shared/models';
import { SecretKind } from '@odf/shared/types';
import { getValidWatchK8sResourceObj } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { SecretRef } from '../types';

export const useSecretData = (secretRef: SecretRef | null) => {
  const isSafe = !!secretRef?.name && !!secretRef?.namespace;
  const resource = getValidWatchK8sResourceObj(
    {
      kind: SecretModel.kind,
      name: secretRef?.name,
      namespace: secretRef?.namespace,
      isList: false,
    },
    isSafe
  );

  const [secretData, secretLoaded, secretError] =
    useK8sWatchResource<SecretKind>(resource);

  return {
    secretData: isSafe ? secretData : null,
    secretLoaded: isSafe ? secretLoaded : true,
    secretError: isSafe ? secretError : null,
  };
};
