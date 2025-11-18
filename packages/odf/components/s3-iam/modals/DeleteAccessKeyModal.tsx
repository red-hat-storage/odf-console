import * as React from 'react';
import { AccessKeyMetadata } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared';
import { DELETE, S3IAMCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import { TFunction, Trans } from 'react-i18next';
import {
  Modal,
  ModalVariant,
  Button,
  ButtonVariant,
  TextContent,
  TextVariants,
  FormGroup,
  TextInput,
  TextInputTypes,
  Alert,
  AlertVariant,
  Text,
} from '@patternfly/react-core';

type DeleteAccessKeyModalProps = {
  accessKeyCard: AccessKeyMetadata;
  noobaaS3IAM: S3IAMCommands;
  refetchAll: () => Promise<void>;
};

const getTextInputLabel = (t: TFunction) => (
  <Trans t={t as any}>
    <b>
      To confirm deletion, type <i>{{ delete: DELETE }}</i>:
    </b>
  </Trans>
);

const DeleteAccessKeyModal: React.FC<
  CommonModalProps<DeleteAccessKeyModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { accessKeyCard, noobaaS3IAM, refetchAll },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>(null);
  const [deactivateSuccess, setDeactivateSuccess] = React.useState(false);

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);
    try {
      await noobaaS3IAM.deleteAccessKey({
        UserName: accessKeyCard.UserName,
        AccessKeyId: accessKeyCard.AccessKeyId,
      });

      setInProgress(false);
      closeModal();
      await refetchAll();
    } catch (err) {
      setInProgress(false);
      setDeleteError(err);
    }
  };

  const onDeactivate = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await noobaaS3IAM.updateAccessKey({
        AccessKeyId: accessKeyCard.AccessKeyId,
        Status: 'Inactive',
        UserName: accessKeyCard.UserName,
      });

      setInProgress(false);
      setDeactivateSuccess(true);
      await refetchAll();
    } catch (err) {
      setInProgress(false);
      setDeleteError(err);
    }
  };

  return (
    <Modal
      title={t('Delete accesskey?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      actions={[
        <div>
          {inProgress && (
            <Text className="text-muted pf-v5-u-mb-sm">
              <em>
                {t('The bucket is being deleted. This may take a while.')}
              </em>
            </Text>
          )}
          <Button
            key="confirm"
            variant={ButtonVariant.danger}
            isLoading={inProgress}
            onClick={onDelete}
            isDisabled={inputValue !== DELETE || inProgress}
          >
            {t('Delete')}
          </Button>

          <Button
            key="cancel"
            variant={ButtonVariant.link}
            onClick={closeModal}
          >
            {t('Cancel')}
          </Button>
        </div>,
      ]}
    >
      <TextContent className="text-muted">
        <Text component={TextVariants.p}>
          {t(
            'Delete the accesskey? All policies and permissions under this access key will be deleted.'
          )}
        </Text>
        <Text component={TextVariants.p}>
          {t('This action cannot be undone')}
        </Text>
        {accessKeyCard.Status === 'Active' && !deactivateSuccess && (
          <>
            <Text component={TextVariants.p}>
              {t(
                'You must deactivate the access key before you can delete it. We recommend analyzing the impact of deactivating the access key before permanently deleting it.'
              )}
            </Text>
            <Button
              variant="warning"
              onClick={onDeactivate}
              isDisabled={inProgress}
            >
              {t('Deactivate')}
            </Button>
          </>
        )}
      </TextContent>
      {deactivateSuccess && (
        <Alert
          variant={AlertVariant.success}
          isInline
          title={t('Access key deactivated successfully')}
          className="pf-v5-u-mt-md"
        >
          {t('You can now delete the access key.')}
        </Alert>
      )}
      <FormGroup
        label={getTextInputLabel(t)}
        className="pf-v5-u-mt-2xl pf-v5-u-mb-sm"
        fieldId="delete-bucket"
      >
        <TextInput
          value={inputValue}
          type={TextInputTypes.text}
          onChange={(_event, value) => setInputValue(value)}
          aria-label={t('delete-accessKey')}
          placeholder={DELETE}
        />
      </FormGroup>
      {deleteError && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          title={t('Error')}
          className="pf-v5-u-mt-md"
        >
          {deleteError?.message}
        </Alert>
      )}
    </Modal>
  );
};

export default DeleteAccessKeyModal;
