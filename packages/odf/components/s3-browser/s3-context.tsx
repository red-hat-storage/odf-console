import * as React from 'react';
import { NOOBAA_ADMIN_SECRET } from '@odf/core/constants';
import { ODF_ADMIN } from '@odf/core/features';
import { S3ProviderType } from '@odf/core/types';
import { StatusBox } from '@odf/shared/generic/status-box';
import { dataPathSeparationProxy, S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isClientPlugin } from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Alert, Spinner } from '@patternfly/react-core';
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
  const { t } = useCustomTranslation();
  const isAdmin = useFlag(ODF_ADMIN);
  const isClientCluster = isClientPlugin();

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
  } = useStorage(providerType);

  const { secretRef, secretFieldKeys } = useSecretRef(
    storedSecretRef,
    providerConfig
  );

  const { secretData, secretLoaded, secretError } = useSecretData(secretRef);

  const {
    client,
    dataPathClient,
    error: s3ClientError,
  } = useClient(secretData, secretFieldKeys, providerConfig, providerType);

  let s3Client = client;
  if (isClientCluster && dataPathClient) {
    s3Client = dataPathSeparationProxy(
      client as S3Commands,
      dataPathClient as S3Commands
    );
  }

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

  // Admin (Provider) flow: no login form (auto login using a pre-created admin secret)
  // Non-admin (Provider) & Client cluster flow: show login form if secret is not loaded
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

  const isNoobaaSetupInProgress =
    secretRef?.name === NOOBAA_ADMIN_SECRET &&
    _.get(secretError, 'response.status') === 404;
  if (isNoobaaSetupInProgress) {
    return (
      <Alert
        className="pf-v6-u-m-md"
        variant="custom"
        isInline
        customIcon={<Spinner size="md" />}
        title={t('Buckets are not available yet')}
      >
        {t(
          'Object Storage setup is still in progress. The Buckets view will be available after MCG is deployed and the S3 endpoint configuration is created. This usually takes 5-10 minutes after StorageCluster creation.'
        )}
      </Alert>
    );
  }

  return <StatusBox loaded={allLoaded} loadError={anyError} />;
};
