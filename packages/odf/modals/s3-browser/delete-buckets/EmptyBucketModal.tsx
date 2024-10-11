import * as React from 'react';
import { NoobaaS3Context } from '@odf/core/components/s3-browser/noobaa-context';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, Button, TextInput, ModalVariant } from '@patternfly/react-core';

type EmptyBucketModalProps = {
  bucketName: string;
  /* refreshTokens: () => Promise<void>; */
};

const EmptyBucketModal: React.FC<CommonModalProps<EmptyBucketModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName },
}) => {
  const { t } = useCustomTranslation();
  const [inputValue, setInputValue] = React.useState('');
  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState(null);

  const { noobaaS3 } = React.useContext(NoobaaS3Context);

  // const stack =
  //   React[
  //     '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'
  //   ].ReactDebugCurrentFrame.getCurrentStack();
  // console.log('DIVYANSH', stack);

  const onEmpty = async (event) => {
    event.preventDefault();
    setInProgress(true);

    try {
      const objects = await noobaaS3?.listObjects({ Bucket: bucketName });
      const deleteObjectKeys = objects?.Contents.map((object) => ({
        Key: object.Key,
      }));

      const response = await noobaaS3?.deleteObjects({
        Bucket: bucketName,
        Delete: { Objects: deleteObjectKeys },
      });
      console.log(response);

      setInProgress(false);
      closeModal();
      // Refresh tokens or any other necessary state updates
      /* refreshTokens(); */
    } catch (err) {
      setInProgress(false);
      setError(err);
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
        <div className="text-muted">
          <p>
            {t(
              'Emptying the bucket deletes all objects in the bucket and cannot be undone. Objects added to the bucket while the empty bucket action is in progress might be deleted.'
            )}
          </p>
          <p>
            {t(
              'To prevent new objects from being added to this bucket while the empty bucket action is in progress, you might need to update your bucket policy to stop objects from being added to the bucket.'
            )}
          </p>
        </div>
      }
      actions={[
        <Button
          key="confirm"
          variant="danger"
          onClick={onEmpty}
          isDisabled={inputValue !== bucketName || inProgress}
        >
          {t('Empty bucket')}
        </Button>,
        <Button key="cancel" variant="link" onClick={closeModal}>
          {t('Cancel')}
        </Button>,
      ]}
    >
      <p>
        {t(
          'To confirm this action, type {{bucketName}} in the text input field.',
          { bucketName }
        )}
      </p>
      <TextInput
        value={inputValue}
        type="text"
        onChange={(_event, value) => setInputValue(value)}
        aria-label={t('Bucket name input')}
        placeholder={bucketName}
      />
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
