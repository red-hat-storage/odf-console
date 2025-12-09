import * as React from 'react';
import { ProviderConfig } from '../registry/s3-providers';
import { SecretRef } from '../types';

export const useSecretRef = (
  isAdmin: boolean,
  storedSecretRef: SecretRef | null,
  providerConfig: ProviderConfig | null
): {
  secretRef: SecretRef | null;
  secretFieldKeys?: ProviderConfig['secretFieldKeys'];
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
        secretFieldKeys: providerConfig.secretFieldKeys,
      };
    }
    if (storedSecretRef) {
      return {
        secretRef: {
          name: storedSecretRef.name,
          namespace: storedSecretRef.namespace,
        },
        secretFieldKeys: providerConfig.secretFieldKeys,
      };
    }
    return { secretRef: null };
  }, [isAdmin, storedSecretRef, providerConfig]);
};
