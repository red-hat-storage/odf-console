import { useK8sGet } from '@odf/shared';
import { SecretModel } from '@odf/shared/models';
import { SecretKind } from '@odf/shared/types';
import { getValidK8sOptions } from '@odf/shared/utils';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { SecretRef } from '../types';

export const useSecretData = (secretRef: SecretRef | null) => {
  const isSafe = !!secretRef?.name && !!secretRef?.namespace;
  const k8sGetArgs = getValidK8sOptions(
    isSafe,
    SecretModel,
    secretRef?.name,
    secretRef?.namespace,
    null
  ) as [K8sKind, string, string, string];

  const [secretData, secretLoaded, secretError] = useK8sGet<SecretKind>(
    ...k8sGetArgs
  );

  return {
    secretData: isSafe ? secretData : null,
    secretLoaded: isSafe ? secretLoaded : true,
    secretError: isSafe ? secretError : null,
  };
};
