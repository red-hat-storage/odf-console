import * as React from 'react';
import { ObjectLockLegalHoldStatus } from '@aws-sdk/client-s3';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import useSWR from 'swr';
import {
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { OBJECT_LEGAL_HOLD_CACHE_KEY_SUFFIX } from '../../../constants';
import { ObjectCrFormat } from '../../../types';
import { getObjectVersionId } from '../../../utils';

export type LegalHoldModalProps = {
  bucketName: string;
  object: ObjectCrFormat;
  s3Client: S3Commands;
  showVersioning: boolean;
  onConfirm?: () => void;
};

const LegalHoldModal: React.FC<CommonModalProps<LegalHoldModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName, object, s3Client, showVersioning, onConfirm },
}) => {
  const { t } = useCustomTranslation();

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const objectKey = getName(object);
  const lastModified = object?.apiResponse?.lastModified;
  const versionId = showVersioning ? getObjectVersionId(object) : undefined;

  const {
    data: legalHoldData,
    mutate: legalHoldMutate,
    isLoading,
  } = useSWR(
    `${s3Client.providerType}-${objectKey}-${lastModified}-${OBJECT_LEGAL_HOLD_CACHE_KEY_SUFFIX}`,
    () =>
      s3Client.getObjectLegalHold({
        Bucket: bucketName,
        Key: objectKey,
        ...(versionId && { VersionId: versionId }),
      })
  );
  const isRemove =
    legalHoldData?.LegalHold?.Status === ObjectLockLegalHoldStatus.ON;

  const onConfirmAction = async () => {
    setInProgress(true);

    try {
      await s3Client.putObjectLegalHold({
        Bucket: bucketName,
        Key: objectKey,
        ...(versionId && { VersionId: versionId }),
        LegalHold: {
          Status: isRemove
            ? ObjectLockLegalHoldStatus.OFF
            : ObjectLockLegalHoldStatus.ON,
        },
      });

      legalHoldMutate();
      setInProgress(false);
      onConfirm?.();
      closeModal();
    } catch (err) {
      setError(err as Error);
      setInProgress(false);
    }
  };

  return (
    <Modal
      title={isRemove ? t('Remove legal hold') : t('Apply legal hold')}
      titleIconVariant={isRemove ? 'warning' : undefined}
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      actions={[
        <ButtonBar
          inProgress={inProgress || isLoading}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={onConfirmAction}
              isDisabled={!!error || inProgress || isLoading}
              className="pf-v6-u-mr-xs"
            >
              {isRemove ? t('Remove') : t('Apply')}
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
          'Prevent objects from being deleted or overwritten until the hold is explicitly removed. Legal hold can be turned on or off by accounts that have specific IAM permissions.'
        )}
      </Content>
    </Modal>
  );
};

export default LegalHoldModal;
