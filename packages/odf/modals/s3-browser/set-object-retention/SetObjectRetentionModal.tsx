import * as React from 'react';
import {
  GetObjectRetentionCommandOutput,
  ObjectLockRetentionMode,
} from '@aws-sdk/client-s3';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands, calculateRetainUntilDate } from '@odf/shared/s3';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant, Tile } from '@patternfly/react-core/deprecated';
import { KeyedMutator } from 'swr';
import {
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Popover,
  SelectOption,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

export enum RetentionPeriodUnit {
  DAYS = 'Days',
  YEARS = 'Years',
}

export type SetObjectRetentionModalProps = {
  bucketName: string;
  objectKey: string;
  versionId?: string;
  s3Client: S3Commands;
  mutate: KeyedMutator<GetObjectRetentionCommandOutput>;
  onConfirm: () => void;
  currentRetentionMode?: ObjectLockRetentionMode;
  currentRetentionPeriod?: number;
  currentRetentionPeriodUnit?: RetentionPeriodUnit;
  currentRetainUntilDate?: Date;
};

const periodUnitOptions: JSX.Element[] = Object.values(RetentionPeriodUnit).map(
  (unit) => (
    <SelectOption key={unit} value={unit}>
      {unit}
    </SelectOption>
  )
);

const SetObjectRetentionModal: React.FC<
  CommonModalProps<SetObjectRetentionModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: {
    bucketName,
    objectKey,
    versionId,
    s3Client,
    mutate,
    onConfirm,
    currentRetentionMode,
    currentRetentionPeriod,
    currentRetentionPeriodUnit,
    currentRetainUntilDate,
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

  // Calculate current RetainUntilDate if we're editing
  const currentRetainUntilDateValue = React.useMemo(() => {
    if (currentRetainUntilDate) {
      return currentRetainUntilDate;
    }
    if (currentRetentionPeriod && currentRetentionPeriodUnit) {
      return calculateRetainUntilDate(
        currentRetentionPeriod,
        currentRetentionPeriodUnit
      );
    }
    return null;
  }, [
    currentRetainUntilDate,
    currentRetentionPeriod,
    currentRetentionPeriodUnit,
  ]);

  // Check if GOVERNANCE mode should be disabled (when current mode is COMPLIANCE)
  const isGovernanceModeDisabled =
    currentRetentionMode === ObjectLockRetentionMode.COMPLIANCE;

  // Validate that new retention date is greater than current retention date
  const isRetentionPeriodValid = React.useMemo(() => {
    if (!currentRetainUntilDateValue) {
      return true;
    }
    if (currentRetentionMode !== ObjectLockRetentionMode.COMPLIANCE) {
      return true;
    }

    const newRetainUntilDate = calculateRetainUntilDate(
      retentionPeriod,
      retentionPeriodUnit
    );
    return newRetainUntilDate > currentRetainUntilDateValue;
  }, [
    retentionPeriod,
    retentionPeriodUnit,
    currentRetainUntilDateValue,
    currentRetentionMode,
  ]);

  const onRetentionPeriodChange = (
    event?: React.FormEvent<HTMLInputElement>
  ) => {
    const value = Math.round(+(event?.target as HTMLInputElement)?.value || 0);
    setError(undefined);
    setRetentionPeriod(Math.max(value, 0));
  };

  const onRetentionPeriodUnitChange = (unit: RetentionPeriodUnit) => {
    setRetentionPeriodUnit(unit);
  };

  const onSet = async () => {
    setInProgress(true);
    setError(undefined);

    try {
      const retainUntilDate = calculateRetainUntilDate(
        retentionPeriod,
        retentionPeriodUnit
      );

      // When editing existing retention in GOVERNANCE mode, we need to bypass governance
      // to allow reducing the retention period (requires s3:BypassGovernanceRetention permission)
      const shouldBypassGovernance =
        currentRetentionMode === ObjectLockRetentionMode.GOVERNANCE &&
        !!currentRetainUntilDateValue &&
        retainUntilDate < currentRetainUntilDateValue;

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
      title={t('Set retention')}
      help={
        <Popover
          aria-label={t('Help')}
          bodyContent={t(
            'Object retention determines how long this object is protected from deletion or overwrite.'
          )}
        >
          <Button
            icon={<OutlinedQuestionCircleIcon />}
            variant={ButtonVariant.plain}
            aria-label={t('Help')}
          />
        </Popover>
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
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error?.message || JSON.stringify(error)}
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={onSet}
              isDisabled={
                !retentionPeriod || !isRetentionPeriodValid || inProgress
              }
              className="pf-v6-u-mr-xs"
            >
              {t('Set')}
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
      <FormGroup label={t('Retention Mode')} fieldId="retention-mode">
        <Flex gap={{ default: 'gapMd' }}>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Tile
              title={t('Governance mode')}
              isSelected={retentionMode === ObjectLockRetentionMode.GOVERNANCE}
              onClick={() =>
                !isGovernanceModeDisabled &&
                setRetentionMode(ObjectLockRetentionMode.GOVERNANCE)
              }
              isDisabled={isGovernanceModeDisabled}
            >
              {t(
                'Users with special permissions can overwrite or delete object during retention'
              )}
            </Tile>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Tile
              title={t('Compliance mode')}
              isSelected={retentionMode === ObjectLockRetentionMode.COMPLIANCE}
              onClick={() =>
                setRetentionMode(ObjectLockRetentionMode.COMPLIANCE)
              }
            >
              {t(
                'No users can overwrite or delete the object during the retention period. This mode has strict restrictions'
              )}
            </Tile>
          </FlexItem>
        </Flex>
      </FormGroup>
      <FormGroup
        label={t('Retention Period')}
        fieldId="retention-period"
        className="pf-v6-u-mt-md"
      >
        <Flex gap={{ default: 'gapSm' }}>
          <FlexItem>
            <NumberInput
              id="retention-period"
              value={retentionPeriod}
              min={0}
              onMinus={() => {
                setError(undefined);
                setRetentionPeriod((p) => Math.max(p - 1, 0));
              }}
              onPlus={() => {
                setError(undefined);
                setRetentionPeriod((p) => p + 1);
              }}
              onChange={onRetentionPeriodChange}
              inputAriaLabel={t('Retention period')}
            />
          </FlexItem>
          <FlexItem>
            <SingleSelectDropdown
              id="retention-period-unit"
              selectOptions={periodUnitOptions}
              selectedKey={retentionPeriodUnit}
              onChange={onRetentionPeriodUnitChange}
            />
          </FlexItem>
        </Flex>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'After the expiry of set retention period, this object is no longer protected'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Modal>
  );
};

export default SetObjectRetentionModal;
