import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { SecretModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
  Label,
} from '@patternfly/react-core';
import { UserIcon } from '@patternfly/react-icons';
import { getProviderLabel } from '../../../utils';
import { StorageType, SecretRef, ClientType } from '../types';
import { hasOBCOwnerRef } from '../utils';
import { LoginFormProps, LoginBody } from './LoginForm';

const LoginModal: React.FC<CommonModalProps<LoginFormProps>> = ({
  closeModal,
  isOpen,
  extraProps: { onLogin, logout, providerType, type = ClientType.S3 },
}) => {
  const { t } = useCustomTranslation();

  const [secretRef, setSecretRef] = React.useState<SecretRef>({
    name: '',
    namespace: '',
  });
  const [storageType, setStorageType] = React.useState<StorageType>(
    StorageType.Session
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const storeCredentials = async () => {
    if (!secretRef.name || !secretRef.namespace) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const secret = await k8sGet({
        model: SecretModel,
        name: secretRef.name,
        ns: secretRef.namespace,
      });

      const obcOwnerRef = hasOBCOwnerRef(secret);

      // Block login from IAM tab if Secret has OBC owner reference
      if (obcOwnerRef && type === ClientType.IAM) {
        setError(
          t(
            'IAM is not supported for ObjectBucketClaim accounts. Please select a different Secret.'
          )
        );
        setIsLoading(false);
        return;
      }

      logout();
      onLogin(secretRef, storageType, obcOwnerRef);
      closeModal();
    } catch (err) {
      setError(
        err?.message ||
          t(
            'Failed to fetch Secret. Please check the Secret name and namespace.'
          )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={t('Sign in to another account')}
      titleIconVariant={UserIcon}
      isOpen={isOpen}
      onClose={closeModal}
      description={t('Log in to another account to access linked buckets.')}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar inProgress={isLoading} errorMessage={null}>
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={storeCredentials}
              isDisabled={!secretRef.name || !secretRef.namespace || isLoading}
              className="pf-v6-u-mr-xs"
            >
              {t('Sign in')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v6-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Alert
        variant={AlertVariant.warning}
        title={t('You will be signed out of your current account.')}
      >
        {t('To return, sign in again with your account credentials.')}
      </Alert>
      {error && (
        <Alert
          variant={AlertVariant.danger}
          title={error}
          isInline
          className="pf-v6-u-my-md"
        />
      )}
      <Label color="yellow" className="pf-v6-u-my-lg">
        {getProviderLabel(providerType)}
      </Label>
      <LoginBody
        secretRef={secretRef}
        setSecretRef={setSecretRef}
        storageType={storageType}
        setStorageType={setStorageType}
      />
    </Modal>
  );
};

export default LoginModal;
