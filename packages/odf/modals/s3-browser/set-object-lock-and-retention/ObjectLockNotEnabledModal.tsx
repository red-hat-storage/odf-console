import * as React from 'react';
import { BucketVersioningStatus, ObjectLockEnabled } from '@aws-sdk/client-s3';
import {
  BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX,
  BUCKET_VERSIONING_CACHE_KEY_SUFFIX,
} from '@odf/core/constants';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
import { getIsVersioningEnabled } from '@odf/shared/s3/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import useSWR, { useSWRConfig } from 'swr';
import {
  Button,
  ButtonVariant,
  Content,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';

export type ObjectLockNotEnabledModalProps = {
  bucketName: string;
  s3Client: S3Commands;
};

const ObjectLockNotEnabledModal: React.FC<
  CommonModalProps<ObjectLockNotEnabledModalProps>
> = ({ closeModal, isOpen, extraProps: { bucketName, s3Client } }) => {
  const { t } = useCustomTranslation();
  const { mutate } = useSWRConfig();
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const versioningCacheKey = `${s3Client.providerType}-${bucketName}-${BUCKET_VERSIONING_CACHE_KEY_SUFFIX}`;
  const objectLockCacheKey = `${s3Client.providerType}-${bucketName}-${BUCKET_OBJECT_LOCK_CACHE_KEY_SUFFIX}`;

  const { data: versioningData } = useSWR(versioningCacheKey, () =>
    s3Client.getBucketVersioning({ Bucket: bucketName })
  );
  const isVersioningEnabled = getIsVersioningEnabled(versioningData);

  const onEnable = async () => {
    setInProgress(true);
    setErrorMessage('');

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
        mutate(versioningCacheKey);
      }

      await s3Client.putObjectLockConfiguration({
        Bucket: bucketName,
        ObjectLockConfiguration: {
          ObjectLockEnabled: ObjectLockEnabled.Enabled,
        },
      });

      mutate(objectLockCacheKey);
      closeModal();
    } catch (error) {
      const errorMsg = error?.message || String(error);
      setErrorMessage(`${t('Error while enabling object lock')}: ${errorMsg}`);
    } finally {
      setInProgress(false);
    }
  };

  return (
    <Modal
      title={t('Object lock not enabled')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.small}
      actions={[
        <Button
          key="enable"
          variant={ButtonVariant.primary}
          onClick={onEnable}
          isLoading={inProgress}
          isDisabled={inProgress}
        >
          {t('Enable')}
        </Button>,
        <Button
          key="cancel"
          variant={ButtonVariant.link}
          onClick={closeModal}
          isDisabled={inProgress}
        >
          {t('Cancel')}
        </Button>,
      ]}
    >
      <Content>
        {t(
          'Enable object lock for this bucket first. Once enabled, object lock settings can be applied to objects within the bucket.'
        )}
      </Content>
      <Alert
        variant={AlertVariant.info}
        title={t('Enabling object lock enables versioning')}
        isInline
        className="pf-v6-u-mt-md"
      />
      {errorMessage && (
        <Alert
          variant={AlertVariant.danger}
          title={t('Error')}
          isInline
          className="pf-v6-u-mt-md"
        >
          {errorMessage}
        </Alert>
      )}
    </Modal>
  );
};

export default ObjectLockNotEnabledModal;
