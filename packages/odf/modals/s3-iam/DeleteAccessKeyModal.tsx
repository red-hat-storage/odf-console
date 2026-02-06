import * as React from 'react';
import { AccessKeyMetadata } from '@aws-sdk/client-iam';
import { AccessKeyStatus } from '@odf/core/constants/s3-iam';
import { useCustomTranslation } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { IamCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { TFunction, Trans } from 'react-i18next';
import {
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
  FormGroup,
  TextInput,
  TextInputTypes,
  Alert,
  AlertVariant,
  ActionGroup,
} from '@patternfly/react-core';

type DeleteAccessKeyModalProps = {
  accessKeyCard: AccessKeyMetadata;
  iamClient: IamCommands;
  refreshTokens: () => void;
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
  extraProps: { accessKeyCard, iamClient, refreshTokens },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error | null>(null);
  const [deactivateSuccess, setDeactivateSuccess] = React.useState(false);

  const onDelete = React.useCallback(
    async (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      event.preventDefault();
      setInProgress(true);
      try {
        await iamClient.deleteAccessKey({
          UserName: accessKeyCard.UserName,
          AccessKeyId: accessKeyCard.AccessKeyId,
        });

        // Remove the description tag (Key = AccessKeyId)
        await iamClient.untagUser({
          UserName: accessKeyCard.UserName,
          TagKeys: [accessKeyCard.AccessKeyId],
        });

        setInProgress(false);
        closeModal();
        refreshTokens?.();
      } catch (err) {
        setInProgress(false);
        setDeleteError(err);
      }
    },
    [
      accessKeyCard.AccessKeyId,
      accessKeyCard.UserName,
      closeModal,
      iamClient,
      refreshTokens,
    ]
  );

  const onDeactivate = React.useCallback(
    async (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
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
        refreshTokens?.();
      } catch (err) {
        setInProgress(false);
        setDeleteError(err);
      }
    },
    [
      accessKeyCard.AccessKeyId,
      accessKeyCard.UserName,
      iamClient,
      refreshTokens,
    ]
  );

  const isDeleteDisabled = React.useMemo(() => {
    return (
      inputValue !== t('delete') ||
      inProgress ||
      (accessKeyCard.Status === AccessKeyStatus.ACTIVE && !deactivateSuccess)
    );
  }, [accessKeyCard.Status, deactivateSuccess, inProgress, inputValue, t]);

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
              isDisabled={isDeleteDisabled}
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
      <Content className="text-muted">
        <Content component={ContentVariants.p}>
          {t(
            'Delete the access key? All policies and permissions under this access key will be deleted.'
          )}
        </Content>
        <Content component={ContentVariants.p}>
          {t('This action cannot be undone')}
        </Content>
        {accessKeyCard.Status === AccessKeyStatus.ACTIVE &&
          !deactivateSuccess && (
            <>
              <Content component={ContentVariants.p}>
                {t(
                  'You must deactivate the access key before you can delete it. We recommend analyzing the impact of deactivating the access key before permanently deleting it.'
                )}
              </Content>
              <Button
                variant="warning"
                onClick={onDeactivate}
                isDisabled={inProgress}
              >
                {t('Deactivate')}
              </Button>
            </>
          )}
      </Content>
      {deactivateSuccess && (
        <Alert
          variant={AlertVariant.success}
          isInline
          title={t('Access key deactivated successfully')}
          className="pf-v6-u-mt-md"
        >
          {t('You can now delete the access key.')}
        </Alert>
      )}
      <FormGroup
        label={getTextInputLabel(t)}
        className="pf-v6-u-mt-2xl pf-v6-u-mb-sm"
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
