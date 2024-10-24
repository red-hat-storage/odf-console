import * as React from 'react';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import { Trans } from 'react-i18next';
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
} from '@patternfly/react-core';

type EmptyBucketModalProps = {
  bucketName: string;
  noobaaS3: S3Commands;
  handleEmptyBucketResult?: (success: boolean, errorMessage?: string) => void;
  refreshTokens?: () => void;
};

// todo move to utils
export const getTextInputLabel = (t: TFunction, bucketName: string) => (
  <Trans t={t as any} ns="plugin__odf-console">
    <b>
      To confirm deletion, type <i>{{ bucketName }}</i> in the text input field.
    </b>
  </Trans>
);

const EmptyBucketModal: React.FC<CommonModalProps<EmptyBucketModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, noobaaS3, refreshTokens, handleEmptyBucketResult },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState(null);

  const onEmpty = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      let isTruncated = true;
      let keyMarker: string;
      let versionIdMarker: string;
      const deleteObjectKeys = [];

      while (isTruncated) {
        const searchParams = {
          Bucket: bucketName,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
        };

        // eslint-disable-next-line no-await-in-loop
        const objects = await noobaaS3.listVersionedObjects(searchParams);

        if (objects?.Versions) {
          deleteObjectKeys.push(
            ...objects.Versions.map((object) => ({
              Key: object.Key,
              VersionId: object.VersionId,
            }))
          );
        }

        isTruncated = objects.IsTruncated;
        keyMarker = objects.NextKeyMarker;
        versionIdMarker = objects.NextVersionIdMarker;
      }

      const deletePromises = [];
      for (let i = 0; i < deleteObjectKeys.length; i += 1000) {
        const batch = deleteObjectKeys.slice(i, i + 1000);
        deletePromises.push(
          noobaaS3.deleteObjects({
            Bucket: bucketName,
            Delete: { Objects: batch },
          })
        );
      }

      const responses = await Promise.all(deletePromises);

      responses.forEach((response) => {
        if (response.Errors && response.Errors.length > 0) {
          setError(response.Errors);
        }
      });

      setInProgress(false);
      closeModal();

      refreshTokens?.();
      handleEmptyBucketResult?.(true);
    } catch (err) {
      setInProgress(false);
      handleEmptyBucketResult?.(false, err);
      closeModal();
    }
  };

  return (
    <Modal
      title={t('Empty bucket permanently?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      description={
        <TextContent className="text-muted">
          <Text component={TextVariants.p}>
            {t(
              'Emptying the bucket deletes all objects in the bucket and cannot be undone. Objects added to the bucket while the empty bucket action is in progress might be deleted.'
            )}
          </Text>
          <Text component={TextVariants.p}>
            {t(
              'To prevent new objects from being added to this bucket while the empty bucket action is in progress, you might need to update your bucket policy to stop objects from being added to the bucket.'
            )}
          </Text>
        </TextContent>
      }
      actions={[
        <div>
          {inProgress && (
            <Text className="text-muted pf-v5-u-mb-sm">
              <em>
                {t(
                  'The bucket is being emptied. This may take a while to empty'
                )}
              </em>
            </Text>
          )}
          <div className="">
            <Button
              key="confirm"
              variant="danger"
              isLoading={inProgress}
              onClick={onEmpty}
              isDisabled={inputValue !== bucketName || inProgress}
            >
              {t('Empty bucket')}
            </Button>

            <Button key="cancel" variant="link" onClick={closeModal}>
              {t('Cancel')}
            </Button>
          </div>
        </div>,
      ]}
    >
      <FormGroup
        label={getTextInputLabel(t, bucketName)}
        className="pf-v5-u-mt-2xl pf-v5-u-mb-sm"
        fieldId="empty-bucket"
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
      <div style={{ marginTop: '1rem' }} />
      {error && (
        <div className="error">
          {t('Error: {{error}}', { error: error.message })}
        </div>
      )}
    </Modal>
  );
};

export default EmptyBucketModal;
