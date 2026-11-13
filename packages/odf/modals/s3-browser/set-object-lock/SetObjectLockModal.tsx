import * as React from 'react';
import {
  BucketVersioningStatus,
  GetBucketVersioningCommandOutput,
  GetObjectLockConfigurationCommandOutput,
  ObjectLockEnabled,
} from '@aws-sdk/client-s3';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { KeyedMutator } from 'swr';
import { Button, ButtonVariant } from '@patternfly/react-core';

export type SetObjectLockModalModalProps = {
  mutate: KeyedMutator<GetObjectLockConfigurationCommandOutput>;
  versioningMutate: KeyedMutator<GetBucketVersioningCommandOutput>;
  s3Client: S3Commands;
  bucketName: string;
  isVersioningEnabled: boolean;
};

const SetObjectLockModal: React.FC<
  CommonModalProps<SetObjectLockModalModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    s3Client,
    bucketName,
    mutate,
    versioningMutate,
    isVersioningEnabled,
  },
}) => {
  const { t } = useCustomTranslation();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onEnable = async () => {
    setInProgress(true);

    try {
      // Object Lock requires bucket versioning to be enabled; enable it
      // first if it isn't already.
      if (!isVersioningEnabled) {
        await s3Client.putBucketVersioning({
          Bucket: bucketName,
          VersioningConfiguration: {
            Status: BucketVersioningStatus.Enabled,
          },
        });
        versioningMutate();
      }

      await s3Client.putObjectLockConfiguration({
        Bucket: bucketName,
        ObjectLockConfiguration: {
          ObjectLockEnabled: ObjectLockEnabled.Enabled,
        },
      });

      mutate();
      setInProgress(false);
      closeModal();
    } catch (err) {
      setError(err);
      setInProgress(false);
    }
  };

  return (
    <Modal
      title={t('Enable Object Lock')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {t(
            'Enabling Object Lock prevents objects in this bucket from being deleted or overwritten for a specified retention period. This action cannot be undone, and will also enable bucket versioning if it is not already enabled.'
          )}
        </div>
      }
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={onEnable}
              isDisabled={!!error || inProgress}
              className="pf-v6-u-mr-xs"
            >
              {t('Enable')}
            </Button>
            <Button
              variant={ButtonVariant.link}
              onClick={closeModal}
              className="pf-v6-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      {' '}
    </Modal>
  );
};

export default SetObjectLockModal;
