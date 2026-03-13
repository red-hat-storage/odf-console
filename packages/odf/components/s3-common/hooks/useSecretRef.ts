import * as React from 'react';
import { ODF_ADMIN } from '@odf/core/features';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { ProviderConfig } from '../registry/s3-providers';
import { SecretRef } from '../types';

export const useSecretRef = (
  storedSecretRef: SecretRef | null,
  providerConfig: ProviderConfig | null
): {
  secretRef: SecretRef | null;
  secretFieldKeys?: ProviderConfig['secretFieldKeys'];
} => {
  const isAdmin = useFlag(ODF_ADMIN);

  return React.useMemo(() => {
    if (!providerConfig) {
      return { secretRef: null };
    }

    // Admin (Provider) flow:
    // Use a pre-created admin secret
    if (isAdmin) {
      return {
        secretRef: {
          name: providerConfig.adminSecretName,
          namespace: providerConfig.adminSecretNamespace,
        },
        secretFieldKeys: providerConfig.secretFieldKeys,
      };
    }

    // Non-admin (Provider) & Client cluster flow:
    // Use the secret stored in the session/local storage
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
