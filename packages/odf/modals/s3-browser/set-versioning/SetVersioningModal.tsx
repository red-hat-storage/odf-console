import * as React from 'react';
import {
  BucketVersioningStatus,
  GetBucketVersioningCommandOutput,
} from '@aws-sdk/client-s3';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { KeyedMutator } from 'swr';
import { Button, ButtonVariant } from '@patternfly/react-core';

export type SetVersioningModalModalProps = {
  mutate: KeyedMutator<GetBucketVersioningCommandOutput>;
  s3Client: S3Commands;
  bucketName: string;
  enableVersioning: boolean;
};

const SetVersioningModal: React.FC<
  CommonModalProps<SetVersioningModalModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { s3Client, bucketName, mutate, enableVersioning },
}) => {
  const { t } = useCustomTranslation();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onEnableOrSuspend = async () => {
    setInProgress(true);

    try {
      const params = {
        Bucket: bucketName,
        VersioningConfiguration: {
          Status: enableVersioning
            ? BucketVersioningStatus.Enabled
            : BucketVersioningStatus.Suspended,
        },
      };
      await s3Client.putBucketVersioning(params);

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
      title={
        enableVersioning ? t('Enable Versioning') : t('Suspend versioning')
      }
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <div className="text-muted">
          {enableVersioning
            ? t(
                'Enable versioning may lead to increased expenses. You will need to update the lifecycle rules after enabling versions.'
              )
            : t(
                'Preserves any previous object versions. Changes will be applied to newly created objects.'
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
              onClick={onEnableOrSuspend}
              isDisabled={!!error || inProgress}
              className="pf-v6-u-mr-xs"
            >
              {enableVersioning ? t('Enable') : t('Suspend')}
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

export default SetVersioningModal;
