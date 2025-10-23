import * as React from 'react';
import { ProviderConfig } from '../registry/providers';
import { SecretRef } from '../types';

export const useSecretRef = (
  isAdmin: boolean,
  storedSecretRef: SecretRef | null,
  providerConfig: ProviderConfig | null
): {
  secretRef: SecretRef | null;
  accessKeyField?: string;
  secretKeyField?: string;
} => {
  return React.useMemo(() => {
    if (!providerConfig) {
      return { secretRef: null };
    }

    if (isAdmin) {
      return {
        secretRef: {
          name: providerConfig.adminSecretName,
          namespace: providerConfig.adminSecretNamespace,
        },
        accessKeyField: providerConfig.secretFieldKeys.accessKey,
        secretKeyField: providerConfig.secretFieldKeys.secretKey,
      };
    }
    if (storedSecretRef) {
      return {
        secretRef: {
          name: storedSecretRef.name,
          namespace: storedSecretRef.namespace,
        },
        accessKeyField: providerConfig.secretFieldKeys.accessKey,
        secretKeyField: providerConfig.secretFieldKeys.secretKey,
      };
    }
    return { secretRef: null };
  }, [isAdmin, storedSecretRef, providerConfig]);
};
