import * as React from 'react';
import { useBucketOrigin } from '@odf/core/components/s3-browser/bucket-overview/useBucketOrigin';
import {
  BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
  LIST_VERSIONED_OBJECTS,
} from '@odf/core/constants';
import { ODF_ADMIN } from '@odf/core/features';
import { useUserSettingsLocalStorage } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Trans } from 'react-i18next';
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
  AlertActionLink,
  ButtonVariant,
} from '@patternfly/react-core';
import { BUCKETS_BASE_ROUTE } from '../../../constants';
import { EmptyBucketResponse, getTextInputLabel } from './EmptyBucketModal';
import { LazyEmptyBucketModal } from './lazy-delete-and-empty-bucket';

type DeleteBucketModalProps = {
  bucketName: string;
  s3Client: S3Commands;
  launcher: LaunchModal;
  refreshTokens?: () => void;
  setEmptyBucketResponse: React.Dispatch<
    React.SetStateAction<EmptyBucketResponse>
  >;
};

const DeleteBucketModal: React.FC<CommonModalProps<DeleteBucketModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: {
    bucketName,
    s3Client,
    launcher,
    refreshTokens,
    setEmptyBucketResponse,
  },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>(null);

  const navigate = useNavigate();

  const {
    data,
    error,
    isLoading: isChecking,
  } = useSWR(
    `${s3Client.providerType}-${bucketName}-${LIST_VERSIONED_OBJECTS}`,
    () => s3Client.listObjectVersions({ Bucket: bucketName, MaxKeys: 1 })
  );
  const hasObjects =
    data?.Versions?.length > 0 || data?.DeleteMarkers?.length > 0;

  const [, setFavorites] = useUserSettingsLocalStorage<string[]>(
    BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );
  const isAdmin = useFlag(ODF_ADMIN);
  // "isCreatedByOBC" denotes whether bucket is created via OBC or S3 endpoint (will be false if we are inside folder view)
  const { isCreatedByOBC } = useBucketOrigin(bucketName, null, isAdmin);

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await s3Client.deleteBucket({
        Bucket: bucketName,
      });

      setInProgress(false);
      closeModal();
      setFavorites((oldFavorites) =>
        oldFavorites.filter((bucket) => bucket !== bucketName)
      );
      refreshTokens?.();
      navigate(BUCKETS_BASE_ROUTE);
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
            isDisabled={inputValue !== bucketName || inProgress || hasObjects}
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
      {isChecking ? (
        <Spinner size="md" className="pf-v6-u-mb-md" />
      ) : (
        hasObjects && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            title={t('Cannot delete this bucket: it is not empty')}
            className="co-alert pf-v6-u-mb-md"
            actionLinks={
              <AlertActionLink
                onClick={() =>
                  launcher(LazyEmptyBucketModal, {
                    isOpen: true,
                    extraProps: {
                      bucketName,
                      s3Client,
                      refreshTokens,
                      setEmptyBucketResponse,
                    },
                  })
                }
              >
                {t('Empty bucket')}
              </AlertActionLink>
            }
          >
            <p>
              <Trans t={t}>
                Bucket must be empty before it can be deleted. Use the{' '}
                <b>Empty bucket</b> configuration to erase all the contents i.e.{' '}
                <i>objects</i> of the bucket and try again.
              </Trans>
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
            'Bucket names are unique. If you delete a bucket, another S3 user can use the name.'
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
        label={getTextInputLabel(t, bucketName)}
        className="pf-v6-u-mt-2xl pf-v6-u-mb-sm"
        fieldId="delete-bucket"
      >
        <TextInput
          value={inputValue}
          type={TextInputTypes.text}
          onChange={(_event, value) => setInputValue(value)}
          aria-label={t('Bucket name input')}
          validated={
            inputValue === bucketName
              ? ValidatedOptions.success
              : ValidatedOptions.default
          }
          placeholder={bucketName}
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

export default DeleteBucketModal;
