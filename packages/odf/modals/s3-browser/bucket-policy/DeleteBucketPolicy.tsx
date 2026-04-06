import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { TFunction, Trans } from 'react-i18next';
import {
  Button,
  ButtonVariant,
  TextInput,
  TextInputTypes,
  FormGroup,
} from '@patternfly/react-core';

const DELETE = 'delete';

type DeleteBucketPolicyModalProps = {
  bucketName: string;
  s3Client: S3Commands;
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

const DeleteBucketPolicyModal: React.FC<
  CommonModalProps<DeleteBucketPolicyModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, s3Client, triggerRefresh },
}) => {
  const { t } = useCustomTranslation();

  const [deleteText, setDeleteText] = React.useState<string>('');
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await s3Client.deleteBucketPolicy({ Bucket: bucketName });

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
      title={t('Confirm delete bucket policy?')}
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
              className="pf-v6-u-mr-xs"
            >
              {t('Confirm delete')}
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
      <FormGroup
        label={getTextInputLabel(t)}
        fieldId="delete-objects"
        className="pf-v6-u-mt-lg pf-v6-u-mb-sm"
      >
        <TextInput
          value={deleteText}
          id="delete-policy"
          onChange={(_event, value) => setDeleteText(value)}
          type={TextInputTypes.text}
          placeholder={DELETE}
        />
      </FormGroup>
    </Modal>
  );
};

export default DeleteBucketPolicyModal;
