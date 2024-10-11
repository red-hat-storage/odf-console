import * as React from 'react';
import {
  BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
  LIST_VERSIONED_OBJECTS,
} from '@odf/core/constants';
import { useUserSettingsLocalStorage } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Trans } from 'react-i18next';
import useSWR from 'swr';
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
  Spinner,
  AlertVariant,
  AlertActionLink,
  ButtonVariant,
} from '@patternfly/react-core';
import { EmptyBucketResponse, getTextInputLabel } from './EmptyBucketModal';
import { LazyEmptyBucketModal } from './lazy-delete-and-empty-bucket';

type DeleteBucketModalProps = {
  bucketName: string;
  noobaaS3: S3Commands;
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
    noobaaS3,
    launcher,
    refreshTokens,
    setEmptyBucketResponse,
  },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>(null);

  const {
    data,
    error,
    isLoading: isChecking,
  } = useSWR(`${bucketName}-${LIST_VERSIONED_OBJECTS}`, () =>
    noobaaS3.listObjectVersions({ Bucket: bucketName, MaxKeys: 1 })
  );
  const hasObjects =
    data?.Versions?.length > 0 || data?.DeleteMarkers?.length > 0;

  const [_favorites, setFavorites] = useUserSettingsLocalStorage<string[]>(
    BUCKET_BOOKMARKS_USER_SETTINGS_KEY,
    true,
    []
  );

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await noobaaS3.deleteBucket({
        Bucket: bucketName,
      });

      setInProgress(false);
      closeModal();
      setFavorites((oldFavorites) =>
        oldFavorites.filter((bucket) => bucket !== bucketName)
      );
      refreshTokens?.();
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
        <Spinner size="md" className="pf-v5-u-mb-md" />
      ) : (
        hasObjects && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            title={t('Cannot delete this bucket: it is not empty')}
            className="co-alert pf-v5-u-mb-md"
            actionLinks={
              <AlertActionLink
                onClick={() =>
                  launcher(LazyEmptyBucketModal, {
                    isOpen: true,
                    extraProps: {
                      bucketName,
                      noobaaS3,
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

      <FormGroup
        label={getTextInputLabel(t, bucketName)}
        className="pf-v5-u-mt-2xl pf-v5-u-mb-sm"
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
          className="pf-v5-u-mt-md"
        >
          {error?.message || deleteError?.message}
        </Alert>
      )}
    </Modal>
  );
};

export default DeleteBucketModal;
