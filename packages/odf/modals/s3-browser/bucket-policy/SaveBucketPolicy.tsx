import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Button, ButtonVariant } from '@patternfly/react-core';

type SaveBucketPolicyModalModalProps = {
  bucketName: string;
  s3Client: S3Commands;
  triggerRefresh: () => void;
  policy: string;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};

const SaveBucketPolicyModal: React.FC<
  CommonModalProps<SaveBucketPolicyModalModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, s3Client, triggerRefresh, policy, setSuccess },
}) => {
  const { t } = useCustomTranslation();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onSave = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await s3Client.setBucketPolicy({ Bucket: bucketName, Policy: policy });

      setInProgress(false);
      closeModal();
      setSuccess(true);
      triggerRefresh();
    } catch (err) {
      setInProgress(false);
      setError(err);
    }
  };

  return (
    <Modal
      title={t('Confirm save changes?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t(
            'This action will overwrite the existing configuration, and any updates will immediately affect access permissions for users and applications. Review your changes carefully before proceeding.'
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
              variant={ButtonVariant.primary}
              onClick={onSave}
              isDisabled={!!error || inProgress}
              className="pf-v6-u-mr-xs"
            >
              {t('Update policy')}
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
      {' '}
    </Modal>
  );
};

export default SaveBucketPolicyModal;
