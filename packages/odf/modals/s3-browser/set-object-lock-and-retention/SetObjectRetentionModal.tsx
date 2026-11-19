import * as React from 'react';
import { ObjectLockRetentionMode } from '@aws-sdk/client-s3';
import { CommonModalProps } from '@odf/shared/modals';
import {
  S3Commands,
  calculateRetainUntilDate,
  RetentionPeriodUnit,
} from '@odf/shared/s3';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import useSWR from 'swr';
import { Content, ContentVariants } from '@patternfly/react-core';
import { OBJECT_RETENTION_CACHE_KEY_SUFFIX } from '../../../constants';
import { ObjectCrFormat } from '../../../types';
import { getObjectVersionId } from '../../../utils';
import {
  DisableRetentionConfirmModal,
  RetentionHelpPopover,
  RetentionModalActions,
  RetentionModeTiles,
  RetentionPeriodField,
} from './retention-modal-components';
import {
  RetentionFormState,
  retentionInitialState,
  useEditObjectRetention,
} from './useEditObjectRetention';

export type SetObjectRetentionModalProps = {
  bucketName: string;
  object: ObjectCrFormat;
  s3Client: S3Commands;
  showVersioning: boolean;
  onConfirm?: () => void;
  // When false, shows a confirmation modal to remove object retention
  enableObjectRetention?: boolean;
};

const SetObjectRetentionModal: React.FC<
  CommonModalProps<SetObjectRetentionModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    bucketName,
    object,
    s3Client,
    showVersioning,
    onConfirm,
    enableObjectRetention = true,
  },
}) => {
  const { t } = useCustomTranslation();

  const objectKey = getName(object);
  const lastModified = object?.apiResponse?.lastModified;
  const versionId = showVersioning ? getObjectVersionId(object) : undefined;

  const {
    data: retentionData,
    mutate: retentionMutate,
    isLoading,
  } = useSWR(
    `${s3Client.providerType}-${objectKey}-${lastModified}-${OBJECT_RETENTION_CACHE_KEY_SUFFIX}`,
    () =>
      s3Client.getObjectRetention({
        Bucket: bucketName,
        Key: objectKey,
        ...(versionId && { VersionId: versionId }),
      })
  );

  const objectRetention = retentionData?.Retention;
  const currentRetentionMode = objectRetention?.Mode;
  const currentRetainUntilDate = objectRetention?.RetainUntilDate;

  const [retentionMode, setRetentionMode] =
    React.useState<ObjectLockRetentionMode>(retentionInitialState.mode);
  const [retentionPeriod, setRetentionPeriod] = React.useState<number>(
    retentionInitialState.period
  );
  const [retentionPeriodUnit, setRetentionPeriodUnit] =
    React.useState<RetentionPeriodUnit>(retentionInitialState.periodUnit);

  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const dispatchRetentionForm = React.useCallback(
    ({ mode, period, periodUnit }: RetentionFormState) => {
      setRetentionMode(mode);
      setRetentionPeriod(period);
      setRetentionPeriodUnit(periodUnit);
    },
    []
  );
  useEditObjectRetention({
    existingRetention: objectRetention,
    dispatch: dispatchRetentionForm,
  });

  // Check if GOVERNANCE mode should be disabled (when current mode is COMPLIANCE)
  const isGovernanceModeDisabled =
    currentRetentionMode === ObjectLockRetentionMode.COMPLIANCE;

  // Validate that new retention date is greater than current retention date
  const isRetentionPeriodValid = React.useMemo(() => {
    if (!currentRetainUntilDate) {
      return true;
    }
    if (currentRetentionMode !== ObjectLockRetentionMode.COMPLIANCE) {
      return true;
    }

    const newRetainUntilDate = calculateRetainUntilDate(
      retentionPeriod,
      retentionPeriodUnit
    );
    return newRetainUntilDate > new Date(currentRetainUntilDate);
  }, [
    retentionPeriod,
    retentionPeriodUnit,
    currentRetainUntilDate,
    currentRetentionMode,
  ]);

  const onRetentionPeriodChange = (period: number) => {
    setError(undefined);
    setRetentionPeriod(period);
  };

  const onEnableOrDisable = async () => {
    setInProgress(true);
    setError(undefined);

    try {
      if (enableObjectRetention) {
        const retainUntilDate = calculateRetainUntilDate(
          retentionPeriod,
          retentionPeriodUnit
        );
        const shouldBypassGovernance =
          currentRetentionMode === ObjectLockRetentionMode.GOVERNANCE &&
          !!currentRetainUntilDate &&
          retainUntilDate < new Date(currentRetainUntilDate);

        await s3Client.putObjectRetention({
          Bucket: bucketName,
          Key: objectKey,
          ...(versionId && { VersionId: versionId }),
          Retention: {
            Mode: retentionMode,
            RetainUntilDate: retainUntilDate,
          },
          ...(shouldBypassGovernance && { BypassGovernanceRetention: true }),
        });
      } else {
        await s3Client.putObjectRetention({
          Bucket: bucketName,
          Key: objectKey,
          ...(versionId && { VersionId: versionId }),
          Retention: {},
          BypassGovernanceRetention: true,
        });
      }

      retentionMutate();
      setInProgress(false);
      onConfirm?.();
      closeModal();
    } catch (err) {
      setError(err);
      setInProgress(false);
    }
  };

  if (!enableObjectRetention) {
    return (
      <DisableRetentionConfirmModal
        isOpen={isOpen}
        closeModal={closeModal}
        title={t('Disable retention')}
        description={t(
          'Disabling retention will allow this object version to be deleted or modified, unless a legal hold is active.'
        )}
        onDisable={onEnableOrDisable}
        inProgress={inProgress || isLoading}
        error={error as Error}
      />
    );
  }

  return (
    <Modal
      title={t('Set retention')}
      help={
        <RetentionHelpPopover
          bodyContent={t(
            'Object retention determines how long this object is protected from deletion or overwrite.'
          )}
        />
      }
      isOpen={isOpen}
      onClose={closeModal}
      description={
        <>
          <Content component={ContentVariants.small}>
            {t('Object: ')}
            <strong>{objectKey}</strong>
          </Content>
          <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
            {t(
              'A retention mode and period is required. This will be applied to this object. Once set, the retention mode can be changed from Governance mode to Compliance mode, but not vice-versa.'
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
          isConfirmDisabled={
            !retentionPeriod ||
            !isRetentionPeriodValid ||
            inProgress ||
            isLoading
          }
          inProgress={inProgress || isLoading}
          error={error as Error}
        />,
      ]}
    >
      <RetentionModeTiles
        retentionMode={retentionMode}
        onChange={setRetentionMode}
        isGovernanceDisabled={isGovernanceModeDisabled}
      />
      <RetentionPeriodField
        period={retentionPeriod}
        onPeriodChange={onRetentionPeriodChange}
        unit={retentionPeriodUnit}
        onUnitChange={setRetentionPeriodUnit}
        helperText={t(
          'After the expiry of set retention period, this object is no longer protected'
        )}
      />
    </Modal>
  );
};

export default SetObjectRetentionModal;
