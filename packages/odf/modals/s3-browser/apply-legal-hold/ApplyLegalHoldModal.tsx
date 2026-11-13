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

export type ApplyLegalHoldModalProps = {
  bucketName: string;
  objectKey: string;
  versionId?: string;
  s3Client: S3Commands;
  mutate: KeyedMutator<any>;
  onConfirm: () => void;
};

const ApplyLegalHoldModal: React.FC<
  CommonModalProps<ApplyLegalHoldModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, objectKey, versionId, s3Client, mutate, onConfirm },
}) => {
  const { t } = useCustomTranslation();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onApply = async () => {
    setInProgress(true);

    try {
      await s3Client.putObjectLegalHold({
        Bucket: bucketName,
        Key: objectKey,
        ...(versionId && { VersionId: versionId }),
        LegalHold: {
          Status: ObjectLockLegalHoldStatus.ON,
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
      title={t('Apply legal hold')}
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
              onClick={onApply}
              isDisabled={!!error || inProgress}
              className="pf-v6-u-mr-xs"
            >
              {t('Apply')}
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
          'Legal hold prevents an object version from being overwritten or deleted. A legal hold can be applied to any object version, and remains in effect until explicitly removed, regardless of retention period.'
        )}
      </Content>
    </Modal>
  );
};

export default ApplyLegalHoldModal;
