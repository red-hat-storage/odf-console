import * as React from 'react';
import {
  GetObjectLockConfigurationCommandOutput,
  ObjectLockEnabled,
  ObjectLockRetentionMode,
} from '@aws-sdk/client-s3';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands, RetentionPeriodUnit } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { KeyedMutator } from 'swr';
import { Content, ContentVariants } from '@patternfly/react-core';
import {
  DisableRetentionConfirmModal,
  RetentionHelpPopover,
  RetentionModalActions,
  RetentionModeTiles,
  RetentionPeriodField,
} from './retention-modal-components';

export type SetDefaultRetentionModalProps = {
  bucketName: string;
  s3Client: S3Commands;
  mutate: KeyedMutator<GetObjectLockConfigurationCommandOutput>;
  onConfirm: () => void;
  // When false, shows a confirmation modal to remove the bucket's default retention.
  enableDefaultRetention?: boolean;
  currentRetentionMode?: ObjectLockRetentionMode;
  currentRetentionPeriod?: number;
  currentRetentionPeriodUnit?: RetentionPeriodUnit;
};

const SetDefaultRetentionModal: React.FC<
  CommonModalProps<SetDefaultRetentionModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    bucketName,
    s3Client,
    mutate,
    onConfirm,
    enableDefaultRetention = true,
    currentRetentionMode,
    currentRetentionPeriod,
    currentRetentionPeriodUnit,
  },
}) => {
  const { t } = useCustomTranslation();

  const [retentionMode, setRetentionMode] =
    React.useState<ObjectLockRetentionMode>(
      currentRetentionMode ?? ObjectLockRetentionMode.GOVERNANCE
    );
  const [retentionPeriod, setRetentionPeriod] = React.useState<number>(
    currentRetentionPeriod ?? 0
  );
  const [retentionPeriodUnit, setRetentionPeriodUnit] =
    React.useState<RetentionPeriodUnit>(
      currentRetentionPeriodUnit ?? RetentionPeriodUnit.DAYS
    );

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const onEnableOrDisable = async () => {
    setInProgress(true);
    setError(undefined);
    try {
      if (enableDefaultRetention) {
        await s3Client.putObjectLockConfiguration({
          Bucket: bucketName,
          ObjectLockConfiguration: {
            ObjectLockEnabled: ObjectLockEnabled.Enabled,
            Rule: {
              DefaultRetention: {
                Mode: retentionMode,
                ...(retentionPeriodUnit === RetentionPeriodUnit.DAYS
                  ? { Days: retentionPeriod }
                  : { Years: retentionPeriod }),
              },
            },
          },
        });
      } else {
        // Omitting "Rule" removes the bucket's default retention
        // configuration while keeping Object Lock itself enabled.
        await s3Client.putObjectLockConfiguration({
          Bucket: bucketName,
          ObjectLockConfiguration: {
            ObjectLockEnabled: ObjectLockEnabled.Enabled,
          },
        });
      }

      mutate();
      setInProgress(false);
      onConfirm();
      closeModal();
    } catch (err) {
      setError(err);
      setInProgress(false);
    }
  };

  if (!enableDefaultRetention) {
    return (
      <DisableRetentionConfirmModal
        isOpen={isOpen}
        closeModal={closeModal}
        title={t('Disable default retention')}
        description={t(
          'Disabling default retention means newly uploaded objects will no longer be automatically protected. Existing objects keep any retention already applied to them.'
        )}
        onDisable={onEnableOrDisable}
        inProgress={inProgress}
        error={error as Error}
      />
    );
  }

  return (
    <Modal
      title={t('Set default retention')}
      help={
        <RetentionHelpPopover
          bodyContent={t(
            'Default retention determines how long new objects added to this bucket are automatically protected from deletion or overwrite.'
          )}
        />
      }
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <>
          <Content component={ContentVariants.small}>
            {t('Bucket: ')}
            <strong>{bucketName}</strong>
          </Content>
          <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
            {t(
              'Specify a default retention mode and period. These apply to new objects uploaded to this bucket without their own retention settings. You can change the default mode between Governance and Compliance at any time; the change applies only to objects uploaded afterward and does not affect existing objects.'
            )}
          </Content>
        </>
      }
      variant={ModalVariant.medium}
      actions={[
        <RetentionModalActions
          confirmLabel={t('Set')}
          onConfirm={onEnableOrDisable}
          closeModal={closeModal}
          isConfirmDisabled={!retentionPeriod || inProgress}
          inProgress={inProgress}
          error={error as Error}
        />,
      ]}
    >
      <RetentionModeTiles
        retentionMode={retentionMode}
        onChange={setRetentionMode}
      />
      <RetentionPeriodField
        period={retentionPeriod}
        onPeriodChange={setRetentionPeriod}
        unit={retentionPeriodUnit}
        onUnitChange={setRetentionPeriodUnit}
        helperText={t(
          'After the expiry of set retention period, objects are no longer protected'
        )}
      />
    </Modal>
  );
};

export default SetDefaultRetentionModal;
