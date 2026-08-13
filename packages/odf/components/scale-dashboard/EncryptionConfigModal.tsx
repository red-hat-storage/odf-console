import * as React from 'react';
import { useCustomTranslation, useYupValidationResolver } from '@odf/shared';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { enableScaleEncryption } from '../scale-encryption/enableScaleEncryption';
import {
  getScaleEncryptionValidationFields,
  scaleEncryptionDefaultValues,
  ScaleEncryptionForm,
  ScaleEncryptionFormData,
} from '../scale-encryption/ScaleEncryptionForm';

type EncryptionConfigModalProps = {
  closeModal: () => void;
  isOpen: boolean;
};

const EncryptionConfigModal: React.FC<EncryptionConfigModalProps> = ({
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();
  const [certificate, setCertificate] = React.useState('');
  const [isEncryptionEnabled, setEncryptionEnabled] = React.useState(false);
  const [error, setError] = React.useState('');
  const [inProgress, setProgress] = React.useState(false);
  const formSchema = React.useMemo(
    () => Yup.object(getScaleEncryptionValidationFields(t, true)),
    [t]
  );
  const resolver =
    useYupValidationResolver<ScaleEncryptionFormData>(formSchema);
  const {
    control,
    getValues,
    formState: { isValid },
  } = useForm<ScaleEncryptionFormData>({
    defaultValues: scaleEncryptionDefaultValues,
    mode: 'onChange',
    resolver,
  });
  const canSubmit = isEncryptionEnabled && !!certificate && isValid;

  const enableEncryption = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const formData = getValues();
    setError('');
    setProgress(true);
    try {
      await enableScaleEncryption({
        certificate,
        client: formData.client,
        password: formData.encryptionPassword,
        port: formData.encryptionPort,
        remoteRKM: formData.remoteRKM,
        server: formData.serverInformation,
        tenant: formData.tenantId,
        username: formData.encryptionUserName,
      });
      closeModal();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProgress(false);
    }
  };

  const close = () => {
    if (!inProgress) closeModal();
  };

  return (
    <Modal isOpen={isOpen} onClose={close} variant={ModalVariant.medium}>
      <ModalHeader
        title={t('Enable data encryption')}
        description={t(
          'Enabling encryption requires a username, password, port, remote RKM, CA certificate, server information, client, and tenant ID. This change applies to the local cluster and will affect all IBM Storage Scale remote cluster connections.'
        )}
      />
      <ModalBody>
        <Form id="encryption-config-form" onSubmit={enableEncryption}>
          <Checkbox
            id="encryption-enabled"
            label={t('Enable data encryption')}
            isChecked={isEncryptionEnabled}
            isDisabled={inProgress}
            onChange={(_event, checked) => setEncryptionEnabled(checked)}
          />
          {isEncryptionEnabled && (
            <ScaleEncryptionForm
              certificate={certificate}
              control={control}
              isDisabled={inProgress}
              onCertificateChange={setCertificate}
            />
          )}
        </Form>
        {error && (
          <Alert
            isInline
            variant="danger"
            title={t('Unable to update data encryption')}
            className="pf-v6-u-mt-md"
          >
            {error}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          type="submit"
          form="encryption-config-form"
          isDisabled={!canSubmit || inProgress}
          isLoading={inProgress}
        >
          {t('Save')}
        </Button>
        <Button variant="link" onClick={close} isDisabled={inProgress}>
          {t('Cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EncryptionConfigModal;
