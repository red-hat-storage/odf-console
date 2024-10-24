import * as React from 'react';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
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
} from '@patternfly/react-core';
import EmptyBucketModal, { getTextInputLabel } from './EmptyBucketModal';

type DeleteBucketModalProps = {
  bucketName: string;
  noobaaS3: S3Commands;
  launcher: LaunchModal;
};

const DeleteBucketModal: React.FC<CommonModalProps<DeleteBucketModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, noobaaS3, launcher },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [hasObjects, setHasObjects] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    const checkBucketContents = async () => {
      try {
        setIsChecking(true);
        const objects = await noobaaS3.listVersionedObjects({
          Bucket: bucketName,
          MaxKeys: 1,
        });
        setHasObjects(objects?.Versions?.length > 0);
      } catch (err) {
        setError(err);
      } finally {
        setIsChecking(false);
      }
    };

    if (isOpen) {
      checkBucketContents();
    }
  }, [isOpen, bucketName, noobaaS3]);

  const onDelete = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      await noobaaS3.deleteBucket({
        Bucket: bucketName,
      });

      setInProgress(false);
      closeModal();
    } catch (err) {
      setInProgress(false);
      setError(err);
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
          <div className="">
            <Button
              key="confirm"
              variant="danger"
              isLoading={inProgress}
              onClick={onDelete}
              isDisabled={inputValue !== bucketName || inProgress || hasObjects}
            >
              {t('Delete bucket')}
            </Button>

            <Button key="cancel" variant="link" onClick={closeModal}>
              {t('Cancel')}
            </Button>
          </div>
        </div>,
      ]}
    >
      {isChecking ? (
        <Spinner size="md" className="pf-v5-u-mb-md" />
      ) : (
        hasObjects && (
          <Alert
            variant="danger"
            isInline
            title={t('Cannot delete this bucket: it is not empty')}
            className="pf-v5-u-mb-md"
          >
            <p>
              {t(
                'Bucket must be empty before they can be deleted. Use the <b>Empty bucket</b> configuration to erase all the contents <i>i.e.</i> of the bucket and try again.'
              )}
              <Button
                variant="link"
                isInline
                onClick={() => {
                  closeModal();
                  launcher(EmptyBucketModal, {
                    isOpen: true,
                    extraProps: {
                      bucketName,
                      noobaaS3,
                    },
                  });
                }}
              >
                {t('Empty bucket')}
              </Button>
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
      {error && (
        <Alert
          variant="danger"
          isInline
          title={t('Error')}
          className="pf-v5-u-mt-md"
        >
          {error.message}
        </Alert>
      )}
    </Modal>
  );
};

export default DeleteBucketModal;
