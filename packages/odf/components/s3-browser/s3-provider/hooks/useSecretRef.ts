import * as React from 'react';
import { PROVIDER_REGISTRY } from '../registry/providers';
import { S3ProviderType, SecretRef } from '../types';

export const useSecretRef = (
  isAdmin: boolean,
  provider: S3ProviderType,
  odfNamespace: string,
  storedSecretRef: SecretRef | null
): {
  secretRef: SecretRef | null;
  accessKeyField?: string;
  secretKeyField?: string;
} => {
  return React.useMemo(() => {
    const entry = PROVIDER_REGISTRY[provider];
    if (isAdmin) {
      return {
        secretRef: {
          name: entry.adminSecretName(odfNamespace),
          namespace: odfNamespace,
        },
        accessKeyField: entry.secretFieldKeys.accessKey,
        secretKeyField: entry.secretFieldKeys.secretKey,
      };
    }
    if (storedSecretRef) {
      return {
        secretRef: {
          name: storedSecretRef.name,
          namespace: storedSecretRef.namespace,
        },
        accessKeyField: entry.secretFieldKeys.accessKey,
        secretKeyField: entry.secretFieldKeys.secretKey,
      };
    }
    return { secretRef: null };
  }, [isAdmin, provider, odfNamespace, storedSecretRef]);
};
