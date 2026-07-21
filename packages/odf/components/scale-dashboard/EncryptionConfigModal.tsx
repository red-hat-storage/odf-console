import * as React from 'react';
import { EncryptionConfigForm } from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/EncryptionConfigForm';
import {
  createConfigMapPayload,
  createEncryptionConfigPayload,
  createUserDetailsSecretPayload,
} from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/payload';
import useScaleSystemFormValidation from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/useFormValidation';
import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import { useCustomTranslation } from '@odf/shared';
import { ConfigMapModel, SecretModel } from '@odf/shared/models';
import { k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';

type EncryptionConfigModalProps = {
  closeModal: () => void;
  isOpen: boolean;
  systemName: string;
};

const namespacedResourceRef = (name: string) => ({
  metadata: { name, namespace: IBM_SCALE_NAMESPACE },
});

const EncryptionConfigModal: React.FC<EncryptionConfigModalProps> = ({
  closeModal,
  isOpen,
  systemName,
}) => {
  const { t } = useCustomTranslation();
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [certificate, setCertificate] = React.useState('');
  const [certificateFileName, setCertificateFileName] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    control,
    fieldRequirements,
    formState: { isValid },
    getValues,
    handleSubmit,
  } = useScaleSystemFormValidation(undefined, {
    encryptionOnly: true,
    defaultValues: {
      encryptionUserName: '',
      encryptionPassword: '',
      encryptionPort: '',
      client: '',
      remoteRKM: '',
      serverInformation: '',
      tenantId: '',
    },
  });

  const encryptionConfigName = `${systemName}-encryption-config`;
  const encryptionSecretName = `${systemName}-encryption-secret`;

  const deleteResource = React.useCallback(
    (model: K8sModel, name: string) =>
      k8sDelete({
        model,
        resource: namespacedResourceRef(name),
        requestInit: null,
        json: null,
      }),
    []
  );

  const enableEncryption = React.useCallback(async () => {
    setError('');
    setIsSubmitting(true);
    const createdResources: Array<{ model: K8sModel; name: string }> = [];

    try {
      const values = getValues();
      await createUserDetailsSecretPayload(
        encryptionSecretName,
        values.encryptionUserName,
        values.encryptionPassword
      )();
      createdResources.push({ model: SecretModel, name: encryptionSecretName });

      if (certificate) {
        await createConfigMapPayload(encryptionConfigName, {
          'enc-ca.crt': certificate,
        })();
        createdResources.push({
          model: ConfigMapModel,
          name: encryptionConfigName,
        });
      }

      await createEncryptionConfigPayload(
        encryptionConfigName,
        values.serverInformation,
        values.tenantId,
        values.client,
        encryptionSecretName,
        certificate ? encryptionConfigName : undefined,
        values.encryptionPort,
        values.remoteRKM
      )();
      closeModal();
    } catch (cause) {
      await Promise.allSettled(
        createdResources
          .reverse()
          .map(({ model, name }) => deleteResource(model, name))
      );
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    certificate,
    closeModal,
    deleteResource,
    encryptionConfigName,
    encryptionSecretName,
    getValues,
  ]);

  const save = React.useCallback(() => {
    if (isEnabled) {
      handleSubmit(enableEncryption)();
    }
  }, [enableEncryption, handleSubmit, isEnabled]);

  const onCertificateInputChange = React.useCallback((_event, file: File) => {
    setCertificateFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCertificate(btoa(event.target?.result as string));
    };
    reader.readAsText(file);
  }, []);

  const isSaveDisabled = !isEnabled || !isValid;

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.small}>
      <ModalHeader title={t('Edit data encryption settings')} />
      <ModalBody>
        <p>
          {t(
            'Opting in encryption requires username, password, port, backup server information. This change applies to the local cluster and will affect all IBM Scale CNSA remote cluster connections.'
          )}
        </p>
        <Form>
          <FormGroup>
            <Checkbox
              id="encryption-enabled"
              label={t('Enable data encryption')}
              isChecked={isEnabled}
              onChange={(_event, checked) => setIsEnabled(checked)}
            />
          </FormGroup>
          {isEnabled && (
            <EncryptionConfigForm
              certificate={certificate}
              certificateFileName={certificateFileName}
              control={control}
              fieldRequirements={fieldRequirements}
              onCertificateClear={() => {
                setCertificate('');
                setCertificateFileName('');
              }}
              onCertificateInputChange={onCertificateInputChange}
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
          onClick={save}
          isDisabled={isSaveDisabled || isSubmitting}
          isLoading={isSubmitting}
        >
          {t('Save')}
        </Button>
        <Button variant="link" onClick={closeModal}>
          {t('Cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EncryptionConfigModal;
