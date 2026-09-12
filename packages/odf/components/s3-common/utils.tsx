import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { NooBaaObjectBucketClaimModel } from '@odf/shared/models';
import { SecretKind } from '@odf/shared/types';
import { isNotFoundError } from '@odf/shared/utils';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'i18next';
import { Alert, Label, Spinner } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { IAction } from '@patternfly/react-table';
import { LazyLoginModal } from './components/LazyLogin';
import { SetSecretRefWithStorage, ClientType, SecretRef } from './types';

export const isAdminSecretNotFound = (
  secretRef: SecretRef | null | undefined,
  secretError: unknown,
  adminSecretName?: string
): boolean =>
  !!adminSecretName &&
  secretRef?.name === adminSecretName &&
  isNotFoundError(secretError);

export const getObjectStorageNotReadyAlert = (t: TFunction) => (
  <Alert
    className="pf-v6-u-m-md"
    variant="custom"
    isInline
    customIcon={<Spinner size="md" />}
    title={t('Multicloud Object Gateway is still initializing.')}
  >
    {t(
      'This page will be available after MCG finishes deploying. This usually takes 5-10 minutes after StorageCluster creation.'
    )}
  </Alert>
);

export const hasOBCOwnerRef = (secret: SecretKind | null): boolean => {
  if (!secret?.metadata?.ownerReferences) {
    return false;
  }

  const obcApiVersion = `${NooBaaObjectBucketClaimModel.apiGroup}/${NooBaaObjectBucketClaimModel.apiVersion}`;

  return secret.metadata.ownerReferences.some(
    (ref) =>
      ref.kind === NooBaaObjectBucketClaimModel.kind &&
      ref.apiVersion === obcApiVersion
  );
};

export const getAccountActionsItems = (
  t: TFunction,
  launcher: LaunchModal,
  providerType: S3ProviderType,
  logout: () => void,
  setSecretRef: SetSecretRefWithStorage,
  clientType?: ClientType
): IAction[] => [
  {
    title: t('Sign in to another account'),
    description: t('You will be signed out of this account.'),
    onClick: () =>
      launcher(LazyLoginModal, {
        isOpen: true,
        extraProps: {
          providerType,
          logout,
          onLogin: setSecretRef,
          type: clientType,
        },
      }),
  },
  {
    title: t('Sign out'),
    onClick: () => logout(),
  },
];

export const getAcountBadge = (t: TFunction) => (
  <Label color="green" icon={<InfoCircleIcon />}>
    {t('Signed in with credentials')}
  </Label>
);
