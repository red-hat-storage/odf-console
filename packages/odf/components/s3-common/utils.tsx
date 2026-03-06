import * as React from 'react';
import { S3ProviderType } from '@odf/core/types';
import { NooBaaObjectBucketClaimModel } from '@odf/shared/models';
import { SecretKind } from '@odf/shared/types';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { Label } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { IAction } from '@patternfly/react-table';
import { LazyLoginModal } from './components/LazyLogin';
import { SetSecretRefWithStorage, ClientType } from './types';

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
