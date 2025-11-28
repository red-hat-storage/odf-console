import * as React from 'react';
import { createFileSystem } from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/payload';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  Button,
  ButtonVariant,
  Form,
  FormGroup,
  Modal,
  TextInput,
} from '@patternfly/react-core';

const AddRemoteFileSystemModal: React.FC<
  CommonModalProps<{ remoteClusterName: string }>
> = ({ closeModal, isOpen, extraProps: { remoteClusterName } }) => {
  const { t } = useCustomTranslation();
  const [remoteFileSystemName, setRemoteFileSystemName] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleCreate = async () => {
    setInProgress(true);
    const fileSystemPromise = createFileSystem(
      remoteClusterName,
      remoteFileSystemName
    );
    try {
      await fileSystemPromise();
    } catch (err) {
      setError(err.message);
    } finally {
      setInProgress(false);
    }
    closeModal();
  };
  return (
    <Modal
      title={t('Add Remote file system')}
      isOpen={isOpen}
      onClose={closeModal}
      actions={[
        <Button
          variant={ButtonVariant.primary}
          onClick={handleCreate}
          isDisabled={!remoteFileSystemName || !!error}
          isLoading={inProgress}
        >
          {t('Add')}
        </Button>,
        <Button variant={ButtonVariant.secondary} onClick={closeModal}>
          {t('Cancel')}
        </Button>,
      ]}
    >
      <Form>
        <FormGroup
          label={t('Remote File System Name')}
          fieldId="remote-file-system-name"
        >
          <TextInput
            id="remote-file-system-name"
            name="remote-file-system-name"
            value={remoteFileSystemName}
            onChange={(_event, value) => setRemoteFileSystemName(value)}
          />
        </FormGroup>
        {error && (
          <Alert variant="danger" title={t('An error occurred')} isInline>
            {JSON.stringify(error)}
          </Alert>
        )}
      </Form>
    </Modal>
  );
};

export default AddRemoteFileSystemModal;
