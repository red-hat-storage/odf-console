import * as React from 'react';
import { useBucketOrigin } from '@odf/core/components/s3-browser/bucket-overview/useBucketOrigin';
import {
  LIST_VECTOR_INDEX,
  VECTOR_BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
  VECTOR_BUCKETS_BASE_ROUTE,
} from '@odf/core/constants/s3-vectors';
import { useUserSettingsLocalStorage } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { S3VectorsCommands } from '@odf/shared/s3-vectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { useNavigate } from 'react-router-dom-v5-compat';
import useSWR from 'swr';
import {
  Button,
  Content,
  TextInput,
  ValidatedOptions,
  TextInputTypes,
  ContentVariants,
  FormGroup,
  Alert,
  Spinner,
  AlertVariant,
  ButtonVariant,
} from '@patternfly/react-core';
import { getTextInputLabel } from '../../s3-browser/delete-and-empty-bucket/EmptyBucketModal';

export type VectorBucketsDeleteResponse = {
  deletedVectorBucketName: string | null;
};

export type SetVectorBucketsDeleteResponse = React.Dispatch<
  React.SetStateAction<VectorBucketsDeleteResponse>
>;

type DeleteVectorBucketModalProps = {
  vectorBucketName: string;
  s3VectorsClient: S3VectorsCommands;
  launcher: LaunchModal;
  refreshTokens?: () => void;
  setDeleteResponse: SetVectorBucketsDeleteResponse;
};

const DeleteVectorBucketModal: React.FC<
  CommonModalProps<DeleteVectorBucketModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    vectorBucketName,
    s3VectorsClient,
    refreshTokens,
    setDeleteResponse,
  },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>(null);

  const navigate = useNavigate();

  const { data, error, isLoading } = useSWR(
    `${s3VectorsClient.providerType}-${vectorBucketName}-${LIST_VECTOR_INDEX}`,
    () =>
      s3VectorsClient.listIndexes({
        vectorBucketName,
        maxResults: 1,
      })
  );

  const hasIndexes = data?.indexes?.length > 0;

  const [, setFavorites] = useUserSettingsLocalStorage<string[]>(
    VECTOR_BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );
  // "isCreatedByOBC" denotes whether bucket is created via OBC or S3 endpoint
  const { isCreatedByOBC } = useBucketOrigin(vectorBucketName, null);

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await s3VectorsClient.deleteVectorBucket({
        vectorBucketName: vectorBucketName,
      });

      setInProgress(false);
      closeModal();
      setFavorites((oldFavorites) =>
        oldFavorites.filter((bucket) => bucket !== vectorBucketName)
      );
      refreshTokens?.();
      setDeleteResponse({ deletedVectorBucketName: vectorBucketName });
      navigate(VECTOR_BUCKETS_BASE_ROUTE);
    } catch (err) {
      setDeleteError(err);
      setInProgress(false);
    }
  };

  return (
    <Modal
      title={t('Delete bucket permanently?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      actions={[
        <div>
          {inProgress && (
            <Content component="p" className="text-muted pf-v6-u-mb-sm">
              <em>
                {t('The bucket is being deleted. This may take a while.')}
              </em>
            </Content>
          )}
          <Button
            key="confirm"
            variant={ButtonVariant.danger}
            isLoading={inProgress}
            onClick={onDelete}
            isDisabled={
              inputValue !== vectorBucketName || inProgress || hasIndexes
            }
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
      {isLoading ? (
        <Spinner size="md" className="pf-v6-u-mb-md" />
      ) : (
        hasIndexes && (
          <Alert
            variant={AlertVariant.warning}
            isInline
            title={t('Cannot delete this vector bucket: it still has indexes')}
            className="co-alert pf-v6-u-mb-md"
          >
            <p>
              {t(
                'The vector bucket must not contain any indexes before it can be deleted. Delete all indexes and try again.'
              )}
            </p>
          </Alert>
        )
      )}
      <Content className="text-muted">
        <Content component={ContentVariants.p}>
          {t('Deleting a bucket cannot be undone.')}
        </Content>
        <Content component={ContentVariants.p}>
          {t(
            'Deleting a bucket cannot be undone. Bucket names are unique. If you delete a bucket, another S3 user can use the name.'
          )}
        </Content>
      </Content>
      {isCreatedByOBC && (
        <Alert
          title={t('Delete OBC')}
          variant={AlertVariant.warning}
          className="pf-v6-u-mt-md"
          isInline
        >
          {t(
            'NooBaa does not automatically delete the OBC if a bucket is deleted. Make sure you delete the corresponding OBC'
          )}
        </Alert>
      )}

      <FormGroup
        label={getTextInputLabel(t, vectorBucketName)}
        className="pf-v6-u-mt-2xl pf-v6-u-mb-sm"
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
      {(error || deleteError) && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          title={t('Error')}
          className="pf-v6-u-mt-md"
        >
          {error?.message || deleteError?.message}
        </Alert>
      )}
    </Modal>
  );
};

export default DeleteVectorBucketModal;
