import * as React from 'react';
import { ObjectLockLegalHoldStatus } from '@aws-sdk/client-s3';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { KeyedMutator } from 'swr';
import {
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
} from '@patternfly/react-core';

export type RemoveLegalHoldModalProps = {
  bucketName: string;
  objectKey: string;
  versionId?: string;
  s3Client: S3Commands;
  mutate: KeyedMutator<any>;
  onConfirm: () => void;
};

const RemoveLegalHoldModal: React.FC<
  CommonModalProps<RemoveLegalHoldModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, objectKey, versionId, s3Client, mutate, onConfirm },
}) => {
  const { t } = useCustomTranslation();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onRemove = async () => {
    setInProgress(true);

    try {
      await s3Client.putObjectLegalHold({
        Bucket: bucketName,
        Key: objectKey,
        ...(versionId && { VersionId: versionId }),
        LegalHold: {
          Status: ObjectLockLegalHoldStatus.OFF,
        },
      });

      mutate();
      setInProgress(false);
      onConfirm();
      closeModal();
    } catch (err) {
      setError(err);
      setInProgress(false);
    }
  };

  return (
    <Modal
      title={t('Remove legal hold')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={onRemove}
              isDisabled={!!error || inProgress}
              className="pf-v6-u-mr-xs"
            >
              {t('Remove')}
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
      <Content component={ContentVariants.small}>
        {t('Object: ')}
        <strong>{objectKey}</strong>
      </Content>
      <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
        {t(
          'Removing the legal hold will allow this object version to be overwritten or deleted, subject to any active retention settings.'
        )}
      </Content>
    </Modal>
  );
};

export default RemoveLegalHoldModal;
