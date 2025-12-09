import * as React from 'react';
import { ODF_ADMIN } from '@odf/core/features';
import { S3ProviderType } from '@odf/core/types';
import { StatusBox } from '@odf/shared/generic/status-box';
import { S3Commands } from '@odf/shared/s3';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { LazyLoginForm } from '../s3-common/components/LazyLogin';
import { useClient } from '../s3-common/hooks/useClient';
import { useProviderConfig } from '../s3-common/hooks/useProviderConfig';
import { useProviderType } from '../s3-common/hooks/useProviderType';
import { useSecretData } from '../s3-common/hooks/useSecretData';
import { useSecretRef } from '../s3-common/hooks/useSecretRef';
import { useStorage } from '../s3-common/hooks/useStorage';
import { StorageType, SecretRef } from '../s3-common/types';

type S3ContextType = {
  s3Client: S3Commands;
  logout?: () => void;
  setSecretRef?: (
    value: SecretRef,
    targetStorageType: StorageType,
    hasOBCOwnerRef?: boolean
  ) => void;
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

  const providerType = useProviderType(s3Provider);

  const {
    config: providerConfig,
    isLoading: providerConfigLoading,
    error: providerConfigError,
  } = useProviderConfig(providerType);

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

  const { client: s3Client, error: s3ClientError } = useClient(
    secretData,
    secretFieldKeys,
    providerConfig,
    providerType
  );

  const allLoaded =
    secretLoaded &&
    !providerConfigLoading &&
    !_.isEmpty(providerConfig) &&
    !_.isEmpty(s3Client) &&
    !loading;
  const anyError = secretError || providerConfigError || s3ClientError || error;

  const contextData = React.useMemo(
    () => ({
      s3Client: (s3Client as S3Commands) || ({} as S3Commands),
      logout: isAdmin ? undefined : logout,
      setSecretRef: isAdmin ? undefined : setSecretRef,
    }),
    [s3Client, isAdmin, logout, setSecretRef]
  );

  const shouldShowLogin = isAdmin
    ? false
    : _.isEmpty(secretRef) && secretLoaded;
  if (shouldShowLogin) {
    return <LazyLoginForm onLogin={setSecretRef} logout={logout} />;
  }

  if (allLoaded && !anyError) {
    return (
      <S3Context.Provider value={contextData}>{children}</S3Context.Provider>
    );
  }

  return <StatusBox loaded={allLoaded} loadError={anyError} />;
};
