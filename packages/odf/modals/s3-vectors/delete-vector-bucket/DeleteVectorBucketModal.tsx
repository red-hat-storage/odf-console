import * as React from 'react';
import { useBucketOrigin } from '@odf/core/components/s3-browser/bucket-overview/useBucketOrigin';
import { BUCKET_BOOKMARKS_USER_SETTINGS_KEY } from '@odf/core/constants';
import { VECTOR_BUCKETS_BASE_ROUTE } from '@odf/core/constants/s3-vectors';
import { ODF_ADMIN } from '@odf/core/features';
import { useUserSettingsLocalStorage } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Modal,
  Button,
  Text,
  TextInput,
  ModalVariant,
  ValidatedOptions,
  TextInputTypes,
  TextVariants,
  TextContent,
  FormGroup,
  Alert,
  AlertVariant,
  ButtonVariant,
} from '@patternfly/react-core';

type DeleteVectorBucketModalProps = {
  vectorBucketName: string;
  vectorBucketArn: string;
  s3VectorsClient: S3VectorsCommands;
  launcher: LaunchModal;
  refreshTokens?: () => void;
};
const getTextInputLabel = (t: TFunction, vectorBucketName: string) => (
  <Trans t={t as any}>
    <b>
      To confirm deletion, type <i>{{ vectorBucketName }}</i>:
    </b>
  </Trans>
);

const DeleteVectorBucketModal: React.FC<
  CommonModalProps<DeleteVectorBucketModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    vectorBucketName,
    vectorBucketArn,
    s3VectorsClient,
    refreshTokens,
  },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>(null);

  const navigate = useNavigate();

  const [, setFavorites] = useUserSettingsLocalStorage<string[]>(
    BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );
  const isAdmin = useFlag(ODF_ADMIN);
  // "isCreatedByOBC" denotes whether bucket is created via OBC or S3 endpoint (will be false if we are inside folder view)
  const { isCreatedByOBC } = useBucketOrigin(vectorBucketName, null, isAdmin);

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await s3VectorsClient.deleteVectorBucket({
        vectorBucketName: vectorBucketName,
        vectorBucketArn: vectorBucketArn,
      });

      setInProgress(false);
      closeModal();
      setFavorites((oldFavorites) =>
        oldFavorites.filter((bucket) => bucket !== vectorBucketName)
      );
      refreshTokens?.();
      navigate(VECTOR_BUCKETS_BASE_ROUTE);
    } catch (err) {
      setDeleteError(err);
      setInProgress(false);
    }
  };

  return (
    <Modal
      title={t('Delete vector bucket permanently?')}
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
            isDisabled={inputValue !== vectorBucketName || inProgress}
          >
            {t('Delete bucket')}
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
          {t('Deleting a bucket cannot be undone.')}
        </Text>
        <Text component={TextVariants.p}>
          {t(
            'Bucket names are unique. If you delete a bucket, another S3 user can use the name.'
          )}
        </Text>
      </TextContent>
      {isCreatedByOBC && (
        <Alert
          title={t('Delete OBC')}
          variant={AlertVariant.warning}
          className="pf-v5-u-mt-md"
          isInline
        >
          {t(
            'NooBaa does not automatically delete the OBC if a bucket is deleted. Make sure you delete the corresponding OBC'
          )}
        </Alert>
      )}

      <FormGroup
        label={getTextInputLabel(t, vectorBucketName)}
        className="pf-v5-u-mt-2xl pf-v5-u-mb-sm"
        fieldId="delete-bucket"
      >
        <TextInput
          value={inputValue}
          type={TextInputTypes.text}
          onChange={(_event, value) => setInputValue(value)}
          aria-label={t('Bucket name input')}
          validated={
            inputValue === vectorBucketName
              ? ValidatedOptions.success
              : ValidatedOptions.default
          }
          placeholder={vectorBucketName}
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

export default DeleteVectorBucketModal;
