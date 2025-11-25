import * as React from 'react';
import { createFileSystem } from '@odf/core/components/create-storage-system/external-systems/CreateScaleSystem/payload';
import { ButtonBar } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
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
      setError(err);
    } finally {
      setInProgress(false);
    }
    closeModal();
  };
  return (
    <Modal
      title={t('Add Remote FileSystem')}
      isOpen={isOpen}
      onClose={closeModal}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <Flex display={{ default: 'inlineFlex' }}>
            <FlexItem>
              <Button
                variant={ButtonVariant.primary}
                onClick={handleCreate}
                isDisabled={!remoteFileSystemName || !!error}
                isLoading={inProgress}
              >
                {t('Add')}
              </Button>
            </FlexItem>
            <FlexItem>
              <Button variant={ButtonVariant.secondary} onClick={closeModal}>
                {t('Cancel')}
              </Button>
            </FlexItem>
          </Flex>
        </ButtonBar>,
      ]}
    >
      <Form>
        <FormGroup
          label={t('Remote filesystem name')}
          fieldId="remote-file-system-name"
        >
          <TextInput
            id="remote-file-system-name"
            name="remote-file-system-name"
            value={remoteFileSystemName}
            onChange={(_event, value) => setRemoteFileSystemName(value)}
          />
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default AddRemoteFileSystemModal;
