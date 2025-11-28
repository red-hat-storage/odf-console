import * as React from 'react';
import {
  AccessKeyMetadata,
  ListAccessKeysCommandOutput,
} from '@aws-sdk/client-iam';
import { AccessKeyStatus } from '@odf/core/constants/s3-iam';
import { useCustomTranslation } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { IamCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import { TFunction, Trans } from 'react-i18next';
import { KeyedMutator } from 'swr';
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
  ActionGroup,
} from '@patternfly/react-core';

type DeleteAccessKeyModalProps = {
  accessKeyCard: AccessKeyMetadata;
  iamClient: IamCommands;
  refetch: KeyedMutator<ListAccessKeysCommandOutput>;
};

const getTextInputLabel = (t: TFunction) => (
  <Trans t={t as any}>
    <b>
      To confirm deletion, type <i>{{ delete: t('delete') }}</i>:
    </b>
  </Trans>
);

const DeleteAccessKeyModal: React.FC<
  CommonModalProps<DeleteAccessKeyModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { accessKeyCard, iamClient, refetch },
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
      await iamClient.deleteAccessKey({
        UserName: accessKeyCard.UserName,
        AccessKeyId: accessKeyCard.AccessKeyId,
      });

      setInProgress(false);
      closeModal();
      await refetch();
    } catch (err) {
      setInProgress(false);
      setDeleteError(err);
    }
  };

  const onDeactivate = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await iamClient.updateAccessKey({
        AccessKeyId: accessKeyCard.AccessKeyId,
        Status: AccessKeyStatus.INACTIVE,
        UserName: accessKeyCard.UserName,
      });

      setInProgress(false);
      setDeactivateSuccess(true);
      await refetch();
    } catch (err) {
      setInProgress(false);
      setDeleteError(err);
    }
  };

  return (
    <Modal
      title={t('Delete access key?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          key="actions"
          inProgress={inProgress}
          errorMessage={deleteError?.message}
        >
          <ActionGroup>
            <Button
              variant={ButtonVariant.danger}
              onClick={onDelete}
              isDisabled={
                inputValue !== t('delete') || inProgress || !deactivateSuccess
              }
            >
              {t('Delete')}
            </Button>
            <Button variant={ButtonVariant.link} onClick={closeModal}>
              {t('Cancel')}
            </Button>
          </ActionGroup>
        </ButtonBar>,
      ]}
    >
      <TextContent className="text-muted">
        <Text component={TextVariants.p}>
          {t(
            'Delete the access key? All policies and permissions under this access key will be deleted.'
          )}
        </Text>
        <Text component={TextVariants.p}>
          {t('This action cannot be undone')}
        </Text>
        {accessKeyCard.Status === AccessKeyStatus.ACTIVE &&
          !deactivateSuccess && (
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
          aria-label={t('Delete access key')}
          placeholder={t('delete')}
        />
      </FormGroup>
    </Modal>
  );
};

export default DeleteAccessKeyModal;
