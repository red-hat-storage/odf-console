import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Button, ButtonVariant } from '@patternfly/react-core';

type SaveVectorBucketPolicyModalModalProps = {
  vectorBucketName: string;
  s3VectorsClient: S3VectorsCommands;
  triggerRefresh: () => void;
  policy: string;
  setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
};

const SaveVectorBucketPolicyModal: React.FC<
  CommonModalProps<SaveVectorBucketPolicyModalModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    vectorBucketName,
    s3VectorsClient,
    triggerRefresh,
    policy,
    setSuccess,
  },
}) => {
  const { t } = useCustomTranslation();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onSave = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await s3VectorsClient.setVectorBucketPolicy({
        vectorBucketName: vectorBucketName,
        policy: policy,
      });

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
              className="pf-v5-u-mr-xs"
            >
              {t('Update policy')}
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
      {' '}
    </Modal>
  );
};

export default SaveVectorBucketPolicyModal;
