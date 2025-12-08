import * as React from 'react';
import { ODF_ADMIN } from '@odf/core/features';
import { S3ProviderType } from '@odf/core/types';
import { StatusBox } from '@odf/shared/generic/status-box';
import { IamCommands } from '@odf/shared/iam';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { LazyLoginForm } from '../s3-common/components/LazyLogin';
import { useClient } from '../s3-common/hooks/useClient';
import { useProviderConfig } from '../s3-common/hooks/useProviderConfig';
import { useSecretData } from '../s3-common/hooks/useSecretData';
import { useSecretRef } from '../s3-common/hooks/useSecretRef';
import { useStorage } from '../s3-common/hooks/useStorage';
import { StorageType, SecretRef, ClientType } from '../s3-common/types';

type IamContextType = {
  iamClient: IamCommands;
  logout?: () => void;
  setSecretRef?: (
    value: SecretRef,
    targetStorageType: StorageType,
    hasOBCOwnerRef?: boolean
  ) => void;
};

type IamProviderProps = {
  children: React.ReactNode;
  loading?: boolean;
  error?: unknown;
};

export const IamContext = React.createContext<IamContextType>(
  {} as IamContextType
);

export const IamProvider: React.FC<IamProviderProps> = ({
  children,
  loading,
  error,
}) => {
  const isAdmin = useFlag(ODF_ADMIN);

  // IAM is currently only supported for Noobaa provider type
  const providerType = S3ProviderType.Noobaa;

  const {
    config: providerConfig,
    isLoading: providerConfigLoading,
    error: providerConfigError,
  } = useProviderConfig(providerType, ClientType.IAM);

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

  const { client: iamClient, error: iamClientError } = useClient(
    secretData,
    secretFieldKeys,
    providerConfig,
    providerType,
    ClientType.IAM
  );

  const allLoaded =
    secretLoaded &&
    !providerConfigLoading &&
    !_.isEmpty(providerConfig) &&
    !_.isEmpty(iamClient) &&
    !loading;
  const anyError =
    secretError || providerConfigError || iamClientError || error;

  const contextData = React.useMemo(
    () => ({
      iamClient: (iamClient as IamCommands) || ({} as IamCommands),
      logout: isAdmin ? undefined : logout,
      setSecretRef: isAdmin ? undefined : setSecretRef,
    }),
    [iamClient, isAdmin, logout, setSecretRef]
  );

  const shouldShowLogin = isAdmin
    ? false
    : _.isEmpty(secretRef) && secretLoaded;
  if (shouldShowLogin) {
    return (
      <LazyLoginForm
        onLogin={setSecretRef}
        logout={logout}
        type={ClientType.IAM}
      />
    );
  }

  if (allLoaded && !anyError) {
    return (
      <IamContext.Provider value={contextData}>{children}</IamContext.Provider>
    );
  }

  return <StatusBox loaded={allLoaded} loadError={anyError} />;
};
