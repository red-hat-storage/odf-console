import * as React from 'react';
import {
  GetObjectLockConfigurationCommandOutput,
  ObjectLockEnabled,
  ObjectLockRetentionMode,
} from '@aws-sdk/client-s3';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { S3Commands } from '@odf/shared/s3';
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

export type SetDefaultRetentionModalProps = {
  bucketName: string;
  s3Client: S3Commands;
  mutate: KeyedMutator<GetObjectLockConfigurationCommandOutput>;
  onConfirm: () => void;
  // Current bucket default retention config (when editing an existing
  // rule). Pre-selects the matching tile and pre-fills the current period
  // and unit.
  currentRetentionMode?: ObjectLockRetentionMode;
  currentRetentionPeriod?: number;
  currentRetentionPeriodUnit?: RetentionPeriodUnit;
};

export enum RetentionPeriodUnit {
  DAYS = 'Days',
  YEARS = 'Years',
}

const periodUnitOptions: JSX.Element[] = Object.values(RetentionPeriodUnit).map(
  (unit) => (
    <SelectOption key={unit} value={unit}>
      {unit}
    </SelectOption>
  )
);

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

  const onRetentionPeriodChange = (
    event?: React.FormEvent<HTMLInputElement>
  ) => {
    const value = Math.round(+(event?.target as HTMLInputElement)?.value || 0);
    setRetentionPeriod(Math.max(value, 0));
  };

  const onSet = async () => {
    setInProgress(true);

    try {
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
      title={t('Set default retention mode')}
      help={
        <Popover
          aria-label={t('Help')}
          bodyContent={t(
            'Default retention determines how long new objects added to this bucket are automatically protected from deletion or overwrite.'
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
            {t('Bucket: ')}
            <strong>{bucketName}</strong>
          </Content>
          <Content component={ContentVariants.p} className="pf-v6-u-mt-sm">
            {t(
              'A retention mode and period is required. This will be applied to any objects created in this bucket. Retention mode can be changed from Governance mode to Compliance mode and vice-versa at bucket level.'
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
              isDisabled={!retentionPeriod || !!error || inProgress}
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
                setRetentionMode(ObjectLockRetentionMode.GOVERNANCE)
              }
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
        fieldId="default-retention-period"
        className="pf-v6-u-mt-md"
      >
        <Flex gap={{ default: 'gapSm' }}>
          <FlexItem>
            <NumberInput
              id="default-retention-period"
              value={retentionPeriod}
              min={0}
              onMinus={() =>
                setRetentionPeriod((period) => Math.max(period - 1, 0))
              }
              onPlus={() => setRetentionPeriod((period) => period + 1)}
              onChange={onRetentionPeriodChange}
              inputAriaLabel={t('Default retention period')}
            />
          </FlexItem>
          <FlexItem>
            <SingleSelectDropdown
              id="default-retention-period-unit"
              selectOptions={periodUnitOptions}
              selectedKey={retentionPeriodUnit}
              onChange={(unit: RetentionPeriodUnit) =>
                setRetentionPeriodUnit(unit)
              }
            />
          </FlexItem>
        </Flex>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'After the expiry of set retention period, objects are no longer protected'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Modal>
  );
};

export default SetDefaultRetentionModal;
