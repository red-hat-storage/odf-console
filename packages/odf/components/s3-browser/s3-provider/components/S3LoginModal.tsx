import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Modal,
  ModalVariant,
  Button,
  ButtonVariant,
  Alert,
  AlertVariant,
  Label,
} from '@patternfly/react-core';
import { UserIcon } from '@patternfly/react-icons';
import { getProviderLabel } from '../../../../utils';
import { StorageType, SecretRef } from '../types';
import { S3LoginFormProps, S3LoginBody } from './S3LoginForm';

const S3LoginModal: React.FC<CommonModalProps<S3LoginFormProps>> = ({
  closeModal,
  isOpen,
  extraProps: { onLogin, logout, providerType },
}) => {
  const { t } = useCustomTranslation();

  const [secretRef, setSecretRef] = React.useState<SecretRef>({
    name: '',
    namespace: '',
  });
  const [storageType, setStorageType] = React.useState<StorageType>(
    StorageType.Session
  );

  const storeCredentials = () => {
    logout();
    onLogin(secretRef, storageType);
    closeModal();
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
        <ButtonBar inProgress={false} errorMessage={null}>
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={storeCredentials}
              isDisabled={!secretRef.name || !secretRef.namespace}
              className="pf-v5-u-mr-xs"
            >
              {t('Sign in')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v5-u-ml-xs"
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
      <Label color="gold" className="pf-v5-u-my-lg">
        {getProviderLabel(providerType)}
      </Label>
      <S3LoginBody
        secretRef={secretRef}
        setSecretRef={setSecretRef}
        storageType={storageType}
        setStorageType={setStorageType}
      />
    </Modal>
  );
};

export default S3LoginModal;
