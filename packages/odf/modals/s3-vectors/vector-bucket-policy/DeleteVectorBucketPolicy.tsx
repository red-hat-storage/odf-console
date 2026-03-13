import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction, Trans } from 'react-i18next';
import {
  Modal,
  ModalVariant,
  Button,
  ButtonVariant,
  TextInput,
  TextInputTypes,
  FormGroup,
} from '@patternfly/react-core';

const DELETE = 'delete';

type DeleteVectorBucketPolicyModalProps = {
  vectorBucketName: string;
  s3VectorsClient: S3VectorsCommands;
  triggerRefresh: () => void;
};

const getTextInputLabel = (t: TFunction) => (
  <Trans t={t as any}>
    <b>
      confirm this action, type <i>{{ delete: DELETE }}</i> in the text input
      field.
    </b>
  </Trans>
);

const DeleteVectorBucketPolicyModal: React.FC<
  CommonModalProps<DeleteVectorBucketPolicyModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { vectorBucketName, s3VectorsClient, triggerRefresh },
}) => {
  const { t } = useCustomTranslation();

  const [deleteText, setDeleteText] = React.useState<string>('');
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await s3VectorsClient.deleteVectorBucketPolicy({
        vectorBucketName: vectorBucketName,
      });

      setInProgress(false);
      closeModal();
      triggerRefresh();
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  return (
    <Modal
      title={t('Confirm delete vector bucket policy?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t(
            'This action will remove all associated access permissions, and any users or applications relying on this policy may lose access. This change cannot be undone.'
          )}
        </div>
      }
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.danger}
              onClick={onDelete}
              isDisabled={deleteText !== DELETE || !!error}
              className="pf-v5-u-mr-xs"
            >
              {t('Confirm delete')}
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
      <FormGroup
        label={getTextInputLabel(t)}
        fieldId="delete-vector-bucket-policy"
        className="pf-v5-u-mt-lg pf-v5-u-mb-sm"
      >
        <TextInput
          value={deleteText}
          id="delete-vector-bucket-policy"
          onChange={(_event, value) => setDeleteText(value)}
          type={TextInputTypes.text}
          placeholder={DELETE}
        />
      </FormGroup>
    </Modal>
  );
};

export default DeleteVectorBucketPolicyModal;
