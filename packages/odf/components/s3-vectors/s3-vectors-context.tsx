import * as React from 'react';
import { ODF_ADMIN } from '@odf/core/features';
import { S3ProviderType } from '@odf/core/types';
import { StatusBox } from '@odf/shared';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { LazyLoginForm } from '../s3-common/components/LazyLogin';
import { useClient } from '../s3-common/hooks/useClient';
import { useProviderConfig } from '../s3-common/hooks/useProviderConfig';
import { useSecretData } from '../s3-common/hooks/useSecretData';
import { useSecretRef } from '../s3-common/hooks/useSecretRef';
import { useStorage } from '../s3-common/hooks/useStorage';
import { ClientType, SecretRef, StorageType } from '../s3-common/types';

type S3VectorsContextType = {
  s3VectorsClient: S3VectorsCommands;
  logout?: () => void;
  setSecretRef?: (
    value: SecretRef,
    targetStorageType: StorageType,
    hasOBCOwnerRef?: boolean
  ) => void;
};

type S3VectorsProviderProps = {
  children: React.ReactNode;
  loading?: boolean;
  error?: unknown;
};

export const S3VectorsContext = React.createContext<S3VectorsContextType>(
  {} as S3VectorsContextType
);

export const S3VectorsProvider: React.FC<S3VectorsProviderProps> = ({
  children,
  loading,
  error,
}) => {
  const isAdmin = useFlag(ODF_ADMIN);

  // S3 Vectors is currently only supported for Noobaa provider type
  const providerType = S3ProviderType.Noobaa;

  const {
    config: providerConfig,
    isLoading: providerConfigLoading,
    error: providerConfigError,
  } = useProviderConfig(providerType, ClientType.S3_VECTORS);

  const {
    secretRef: storedSecretRef,
    setSecretRef,
    logout,
  } = useStorage(providerType, isAdmin);

  const { secretRef, secretFieldKeys } = useSecretRef(
    isAdmin,
    storedSecretRef,
    providerConfig
  );
  const { secretData, secretLoaded, secretError } = useSecretData(secretRef);

  const { client: s3VectorsClient, error: s3VectorsClientError } = useClient(
    secretData,
    secretFieldKeys,
    providerConfig,
    providerType,
    ClientType.S3_VECTORS
  );

  const allLoaded =
    secretLoaded &&
    !providerConfigLoading &&
    !_.isEmpty(providerConfig) &&
    !_.isEmpty(s3VectorsClient) &&
    !loading;

  const anyError =
    secretError || providerConfigError || s3VectorsClientError || error;

  const contextData = React.useMemo(
    () => ({
      s3VectorsClient:
        (s3VectorsClient as S3VectorsCommands) || ({} as S3VectorsCommands),
      logout: isAdmin ? undefined : logout,
      setSecretRef: isAdmin ? undefined : setSecretRef,
    }),
    [s3VectorsClient, isAdmin, logout, setSecretRef]
  );

  const shouldShowLogin = isAdmin
    ? false
    : _.isEmpty(secretRef) && secretLoaded;
  if (shouldShowLogin) {
    return (
      <LazyLoginForm
        onLogin={setSecretRef}
        logout={logout}
        type={ClientType.S3_VECTORS}
      />
    );
  }

  if (allLoaded && !anyError) {
    return (
      <S3VectorsContext.Provider value={contextData}>
        {children}
      </S3VectorsContext.Provider>
    );
  }
  return <StatusBox loaded={allLoaded} loadError={anyError} />;
};
