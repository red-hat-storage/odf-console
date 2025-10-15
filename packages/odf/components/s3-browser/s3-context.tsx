import * as React from 'react';
import { ODF_ADMIN } from '@odf/core/features';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { StatusBox } from '@odf/shared/generic/status-box';
import { S3Commands } from '@odf/shared/s3';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { S3Login } from './s3-provider/components/S3Login';
import { useProviderType } from './s3-provider/hooks/useProviderType';
import { useS3Client } from './s3-provider/hooks/useS3Client';
import { useSecretData } from './s3-provider/hooks/useSecretData';
import { useSecretRef } from './s3-provider/hooks/useSecretRef';
import { useStorage } from './s3-provider/hooks/useStorage';
import { S3ProviderType, StorageType, SecretRef } from './s3-provider/types';

type S3ContextType = {
  s3Client: S3Commands;
  providerType: S3ProviderType;
  logout?: () => void;
  setSecretRef?: (value: SecretRef, targetStorageType: StorageType) => void;
};

type S3ProviderProps = {
  children: React.ReactNode;
  loading?: boolean;
  error?: unknown;
  s3Provider?: S3ProviderType;
};

export const S3Context = React.createContext<S3ContextType>(
  {} as S3ContextType
);

// ToDo: In case this provider is needed at too many places, consider applying it to the console's root or use redux instead
export const S3Provider: React.FC<S3ProviderProps> = ({
  children,
  loading,
  error,
  s3Provider,
}) => {
  const isAdmin = useFlag(ODF_ADMIN);
  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const providerType = useProviderType(s3Provider);

  // We only need this hook for non-admin users
  const {
    secretRef: storedSecretRef,
    setSecretRef,
    logout,
  } = useStorage(providerType, isAdmin);

  const { secretRef, accessKeyField, secretKeyField } = useSecretRef(
    isAdmin,
    providerType,
    odfNamespace,
    storedSecretRef
  );

  const { secretData, secretLoaded, secretError } = useSecretData(secretRef);

  const { s3Client, error: s3ClientError } = useS3Client(
    secretData,
    providerType,
    odfNamespace,
    accessKeyField,
    secretKeyField
  );

  const allLoaded =
    isODFNsLoaded && secretLoaded && !loading && !_.isEmpty(s3Client);
  const anyError = odfNsLoadError || secretError || s3ClientError || error;

  const contextData = React.useMemo(
    () => ({
      s3Client: s3Client || ({} as S3Commands),
      providerType,
      logout: isAdmin ? undefined : logout,
      setSecretRef: isAdmin ? undefined : setSecretRef,
    }),
    [s3Client, providerType, isAdmin, logout, setSecretRef]
  );

  const shouldShowLogin = isAdmin
    ? false
    : _.isEmpty(secretRef) && secretLoaded;
  if (shouldShowLogin) {
    return <S3Login onLogin={setSecretRef} logout={logout} />;
  }

  if (allLoaded && !anyError) {
    return (
      <S3Context.Provider value={contextData}>{children}</S3Context.Provider>
    );
  }

  return <StatusBox loaded={allLoaded} loadError={anyError} />;
};
